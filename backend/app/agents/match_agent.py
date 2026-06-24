"""
Contributor Match Agent — TRD §3.10

Builds real contributor profiles from merged PR history in the repo, then
passes actual usernames + stats to the LLM for ranking.  The LLM never
invents usernames.
"""
import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_profiles_from_prs(
    prs: List[Dict[str, Any]],
    since: datetime,
) -> List[Dict[str, Any]]:
    """Build contributor skill profiles from a list of merged PRs."""
    # Group PRs by author
    by_author: Dict[str, List[Dict]] = defaultdict(list)
    for pr in prs:
        if pr.get("is_merged") and pr.get("author"):
            by_author[pr["author"]].append(pr)

    profiles = []
    inactive_cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    for username, author_prs in by_author.items():
        # Files touched
        all_files: List[str] = []
        for pr in author_prs:
            all_files.extend(pr.get("files", []))

        # Rough language detection from file extensions
        lang_counts: Dict[str, int] = defaultdict(int)
        for f in all_files:
            ext = f.rsplit(".", 1)[-1].lower() if "." in f else "other"
            lang_map = {
                "py": "Python", "ts": "TypeScript", "tsx": "TypeScript",
                "js": "JavaScript", "jsx": "JavaScript", "go": "Go",
                "rs": "Rust", "java": "Java", "rb": "Ruby", "cpp": "C++",
                "c": "C", "md": "Markdown", "yml": "YAML", "yaml": "YAML",
            }
            lang = lang_map.get(ext, ext.upper())
            lang_counts[lang] += 1

        # Recency
        merged_dates = [
            pr["merged_at"] for pr in author_prs
            if pr.get("merged_at")
        ]
        last_active = max(merged_dates) if merged_dates else None

        # PRs in window
        recent_prs = [
            pr for pr in author_prs
            if pr.get("merged_at") and pr["merged_at"] >= since
        ]

        profiles.append({
            "username": username,
            "merged_pr_count": len(author_prs),
            "recent_pr_count": len(recent_prs),
            "top_languages": sorted(lang_counts, key=lang_counts.get, reverse=True)[:3],
            "last_active": last_active.isoformat() if last_active else None,
            "is_inactive": (last_active < inactive_cutoff) if last_active else True,
        })

    # Sort by recent activity descending
    profiles.sort(key=lambda p: p["recent_pr_count"], reverse=True)
    return profiles


def match_contributor(issue_url: str, repo_url: str = None) -> Dict[str, Any]:
    """Recommend real contributors for a given issue based on merged PR history."""
    try:
        # ── 1. Fetch issue data ───────────────────────────────────────────────
        issue_data = github_client.get_issue(issue_url)
        title = issue_data.get("title", "")
        body = issue_data.get("body", "")[:settings.MAX_ISSUE_BODY_CHARS]
        labels = issue_data.get("labels", [])

        # Derive repo_url from issue if not provided
        if not repo_url:
            repo_full_name = issue_data.get("repo_full_name", "")
            if repo_full_name:
                repo_url = f"https://github.com/{repo_full_name}"

        if not repo_url:
            return {"error": "repo_url is required for contributor matching."}

        # ── 2. Fetch merged PRs from repo to build profiles ───────────────────
        since = datetime.now(timezone.utc) - timedelta(days=90)
        merged_prs = github_client.list_pull_requests(
            repo_url, state="closed", since=since
        )
        # Also get file info per PR for language detection
        enriched_prs = []
        for pr in merged_prs:
            if pr.get("is_merged"):
                pr_copy = dict(pr)
                try:
                    pr_copy["files"] = [
                        f["filename"]
                        for f in github_client.get_pr_diff(
                            f"https://github.com/{github_client._parse_repo_name(repo_url)}/pull/{pr['number']}"
                        ).get("files", [])
                    ]
                except Exception:
                    pr_copy["files"] = []
                enriched_prs.append(pr_copy)

        profiles = _build_profiles_from_prs(enriched_prs, since)

        if not profiles:
            return {
                "recommendations": [],
                "excluded": [],
                "note": "No contributors with merged PRs found in the last 90 days.",
            }

        # ── 3. Pass real profiles to LLM for ranking ──────────────────────────
        active_profiles = [p for p in profiles if not p["is_inactive"]][:10]
        inactive_profiles = [p for p in profiles if p["is_inactive"]]

        profiles_text = json.dumps(active_profiles, indent=2, default=str)
        excluded_names = [
            f"{p['username']} (inactive >30 days, last active: {p['last_active'] or 'unknown'})"
            for p in inactive_profiles
        ]

        prompt = PromptTemplate.from_template(
            "You are an expert open source project manager. "
            "Based on the issue details and REAL contributor profiles below, "
            "recommend 2-3 contributors most likely to fix this issue.\n\n"
            "Issue Title: {title}\n"
            "Issue Body: {body}\n"
            "Issue Labels: {labels}\n\n"
            "Real Contributor Profiles (last 90 days of activity):\n{profiles}\n\n"
            "Instructions:\n"
            "- ONLY use usernames from the profiles provided. Do NOT invent names.\n"
            "- Rank by: skill overlap (40%), merged PR count (30%), recency (20%), issue labels match (10%).\n"
            "- Briefly explain why each person is a good match.\n\n"
            "Return ONLY valid JSON:\n"
            "{{\"recommendations\": ["
            "{{\"rank\": 1, \"username\": \"...\", \"reason\": \"...\", \"score\": 90}}"
            "], \"excluded\": [...]}}"
        )

        chain = prompt | llm
        response = chain.invoke({
            "title": title,
            "body": body[:800],
            "labels": ", ".join(labels),
            "profiles": profiles_text,
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        result = json.loads(result_text)

        # Merge our computed excluded list with LLM's
        existing_excluded = result.get("excluded", [])
        result["excluded"] = list(set(existing_excluded) | set(excluded_names))

        return result

    except json.JSONDecodeError as e:
        logger.error("match_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("match_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
