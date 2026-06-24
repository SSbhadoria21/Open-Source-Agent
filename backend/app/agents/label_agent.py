"""
Label Agent — TRD §3.9

Fetches the repo's REAL label configuration and recent few-shot examples,
then asks the LLM to choose ONLY from existing labels.
The LLM may also propose new labels under a separate field.
"""
import json
import logging
from typing import Dict, Any

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

logger = logging.getLogger(__name__)


def label_issue(repo_url: str, issue_summary: Dict[str, Any]) -> Dict[str, Any]:
    """Suggest GitHub labels from the repo's real label set."""
    try:
        # ── 1. Fetch real repo labels ─────────────────────────────────────────
        repo_labels = []
        few_shot_examples = []

        if repo_url:
            try:
                raw_labels = github_client.get_repo_labels(repo_url)
                repo_labels = [l["name"] for l in raw_labels]
            except Exception as e:
                logger.warning("label_agent: could not fetch repo labels: %s", e)

            try:
                recent = github_client.get_recent_issues_with_labels(repo_url, limit=10)
                few_shot_examples = [
                    f"Issue: {i['title']} → Labels: {', '.join(i['labels'])}"
                    for i in recent[:5]
                ]
            except Exception as e:
                logger.warning("label_agent: could not fetch few-shot examples: %s", e)

        # ── 2. Build prompt with real label set ───────────────────────────────
        labels_section = (
            f"Available repo labels: {', '.join(repo_labels)}"
            if repo_labels
            else "No repo labels fetched — suggest general labels."
        )
        examples_section = (
            "\n".join(few_shot_examples)
            if few_shot_examples
            else "No examples available."
        )

        prompt = PromptTemplate.from_template(
            "You are an expert repository maintainer. "
            "Suggest labels for this issue using ONLY labels from the repo's existing set. "
            "If none of the existing labels fit, list proposed new labels under "
            "suggested_new_labels.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "{labels_section}\n\n"
            "Labeling examples from this repo:\n{examples_section}\n\n"
            "Return ONLY valid JSON:\n"
            "{{\"suggested_labels\": [\"...\"], "
            "\"confidence\": {{\"label1\": 0.9}}, "
            "\"suggested_new_labels\": [\"...\"]}}"
        )

        chain = prompt | llm
        response = chain.invoke({
            "issue_summary": json.dumps(issue_summary),
            "labels_section": labels_section,
            "examples_section": examples_section,
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        result = json.loads(result_text)

        # ── 3. Validate: only keep labels that exist in the repo ──────────────
        if repo_labels:
            result["suggested_labels"] = [
                l for l in result.get("suggested_labels", []) if l in repo_labels
            ]

        return result

    except json.JSONDecodeError as e:
        logger.error("label_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("label_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
