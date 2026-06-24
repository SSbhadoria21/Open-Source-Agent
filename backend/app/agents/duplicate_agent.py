"""
Duplicate Issue Agent — TRD §3.8

Pipeline:
  New Issue Text
        │
        ▼
  Embed with Gemini text-embedding-004
        │
        ▼
  Upsert into Chroma 'issues' collection
        │
        ▼
  Query top-5 nearest neighbors (cosine similarity)
        │
        ▼
  For each candidate with similarity ≥ 0.75 → LLM semantic verification
        │
        ▼
  LLM-verified score ≥ similarity_threshold → flag as duplicate
"""
import json
import logging
from typing import Dict, Any

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm, embedding_llm
from app.services.vector_store import vector_store
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cosine similarity floor for passing candidates to LLM verification
_VECTOR_FLOOR = 0.75


def detect_duplicate(
    issue_url: str,
    repo_url: str,
    similarity_threshold: int = None,
) -> Dict[str, Any]:
    """Detect whether a new issue duplicates an existing one using real embeddings."""
    if similarity_threshold is None:
        similarity_threshold = settings.DUPLICATE_SIMILARITY_THRESHOLD

    try:
        # ── 1. Fetch real issue data ──────────────────────────────────────────
        issue_data = github_client.get_issue(issue_url)
        title = issue_data.get("title", "")
        body = issue_data.get("body", "")[:settings.MAX_ISSUE_BODY_CHARS]
        issue_number = issue_data.get("number", 0)
        repo_full_name = issue_data.get("repo_full_name", "")

        text = f"{title}\n{body}"
        issue_id = f"{repo_full_name}:{issue_number}"

        # ── 2. Embed the new issue ────────────────────────────────────────────
        embedding = embedding_llm.embed_query(text)

        # ── 3. Upsert into Chroma (so future checks can match against this) ───
        vector_store.upsert_issue(
            issue_id=issue_id,
            embedding=embedding,
            text=text,
            metadata={
                "repo": repo_full_name,
                "issue_number": issue_number,
                "state": issue_data.get("state", "open"),
            },
        )

        # ── 4. Query top-5 nearest neighbours (filter to same repo) ──────────
        where_filter = {"repo": repo_full_name} if repo_full_name else None
        candidates = vector_store.query_similar(
            embedding=embedding,
            n_results=6,  # 6 because the issue itself will appear
            where=where_filter,
        )

        # Exclude the issue itself from candidates
        candidates = [c for c in candidates if c["id"] != issue_id]

        # ── 5. Filter by vector similarity floor ──────────────────────────────
        above_floor = [c for c in candidates if c["similarity"] >= _VECTOR_FLOOR]

        if not above_floor:
            return {
                "is_duplicate": False,
                "similar_issues": [],
                "recommended_action": "No similar issues found. This appears to be a unique issue.",
                "draft_comment": "",
            }

        # ── 6. LLM verification for candidates above the vector floor ─────────
        similar_issues = []
        for candidate in above_floor:
            meta = candidate.get("metadata", {})
            candidate_number = meta.get("issue_number", "?")
            candidate_text = candidate.get("document", "")

            verify_prompt = PromptTemplate.from_template(
                "You are an expert repository maintainer. "
                "Compare these two GitHub issues and determine how semantically similar they are.\n\n"
                "Issue A (new):\n{issue_a}\n\n"
                "Issue B (existing #{candidate_number}):\n{issue_b}\n\n"
                "Provide a similarity score from 0 to 100, where:\n"
                "  100 = exact duplicate (same root cause, same ask)\n"
                "   75 = closely related but different context\n"
                "   50 = related topic but different problem\n"
                "    0 = completely unrelated\n\n"
                "Return ONLY valid JSON:\n"
                "{{\"score\": 0, \"reasoning\": \"...\"}}"
            )
            chain = verify_prompt | llm
            try:
                response = chain.invoke({
                    "issue_a": text[:1000],
                    "issue_b": candidate_text[:1000],
                    "candidate_number": candidate_number,
                })
                result_text = response.content.replace("```json", "").replace("```", "").strip()
                verification = json.loads(result_text)
                llm_score = int(verification.get("score", 0))
            except json.JSONDecodeError as e:
                logger.warning("duplicate_agent: LLM verification JSON parse error: %s", e)
                llm_score = int(candidate["similarity"] * 100)
            except Exception as e:
                logger.warning("duplicate_agent: LLM verification error: %s", e)
                llm_score = int(candidate["similarity"] * 100)

            if llm_score > 0:
                similar_issues.append({
                    "issue_number": candidate_number,
                    "similarity_score": llm_score,
                    "vector_similarity": round(candidate["similarity"] * 100, 1),
                })

        # ── 7. Determine duplicate status ─────────────────────────────────────
        confirmed_duplicates = [s for s in similar_issues if s["similarity_score"] >= similarity_threshold]
        is_duplicate = len(confirmed_duplicates) > 0

        best_match = max(confirmed_duplicates, key=lambda x: x["similarity_score"]) if confirmed_duplicates else None

        recommended_action = (
            f"Close #{issue_number} as a duplicate of #{best_match['issue_number']}."
            if best_match
            else "No confirmed duplicate found. Similar issues noted for reference."
        )
        draft_comment = (
            f"This issue appears to be a duplicate of #{best_match['issue_number']}. "
            f"Please follow that thread for updates."
            if best_match else ""
        )

        return {
            "is_duplicate": is_duplicate,
            "similar_issues": similar_issues,
            "recommended_action": recommended_action,
            "draft_comment": draft_comment,
        }

    except json.JSONDecodeError as e:
        logger.error("duplicate_agent: unexpected JSON parse error: %s", e)
        return {"error": f"JSON parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("duplicate_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
