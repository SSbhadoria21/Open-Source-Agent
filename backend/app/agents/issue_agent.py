"""
Issue Agent — TRD §3.3

Fetches a GitHub issue and produces a structured explanation.
- labels_detected is taken directly from issue_data["labels"] — not LLM-invented.
- LLM only fills: plain_summary, difficulty, estimated_hours, affected_areas.
- Body truncation uses settings.MAX_ISSUE_BODY_CHARS.
"""
import json
import logging
from typing import Dict, Any

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def explain_issue(issue_url: str) -> Dict[str, Any]:
    """Fetch and simplify a GitHub issue."""
    try:
        issue_data = github_client.get_issue(issue_url)

        # ── Labels come directly from GitHub — LLM does NOT guess these ───────
        real_labels = issue_data.get("labels", [])

        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Analyze the following GitHub issue and provide a simplified explanation.\n\n"
            "Issue Title: {title}\n"
            "Issue Body: {body}\n\n"
            "Classify the difficulty as Beginner, Intermediate, or Advanced:\n"
            "  Beginner: UI-only changes, typo fixes, documentation updates, config changes.\n"
            "  Intermediate: New feature with 2-5 files touched, minor API changes.\n"
            "  Advanced: Architectural changes, security fixes, performance-critical code.\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "plain_summary": "...",\n'
            '  "difficulty": "Beginner|Intermediate|Advanced",\n'
            '  "estimated_hours": 0,\n'
            '  "affected_areas": ["..."]\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )

        chain = prompt | llm
        response = chain.invoke({
            "title": issue_data.get("title", ""),
            "body": issue_data.get("body", "")[:settings.MAX_ISSUE_BODY_CHARS],
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        llm_result = json.loads(result_text)

        # ── Assemble final result with real GitHub data ────────────────────────
        return {
            "title": f"Issue #{issue_data.get('number', '')}: {issue_data.get('title', '')}",
            "plain_summary": llm_result.get("plain_summary", ""),
            "difficulty": llm_result.get("difficulty", ""),
            "estimated_hours": llm_result.get("estimated_hours", 0),
            "affected_areas": llm_result.get("affected_areas", []),
            "labels_detected": real_labels,  # real labels from GitHub, not LLM guess
        }

    except json.JSONDecodeError as e:
        logger.error("issue_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("issue_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
