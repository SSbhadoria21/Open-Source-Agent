import json
import logging
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def triage_issue(issue_url: str) -> Dict[str, Any]:
    """Classify and prioritize incoming issues automatically."""
    try:
        issue_data = github_client.get_issue(issue_url)
        
        prompt = PromptTemplate.from_template(
            "You are an expert repository maintainer. "
            "Classify and prioritize the following GitHub issue.\n\n"
            "Priority Guidelines:\n"
            "- Words like 'crash', 'data loss', 'security', 'broken in production' -> High to Critical\n"
            "- Words like 'performance', 'slow', 'timeout' -> Medium to High\n"
            "- Words like 'typo', 'docs', 'suggestion' -> Low\n\n"
            "Issue Title: {title}\n"
            "Issue Body: {body}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "issue_type": "...",\n'
            '  "affected_area": "...",\n'
            '  "priority": "...",\n'
            '  "suggested_labels": ["..."],\n'
            '  "suggested_assignee_query": "..."\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "title": issue_data.get("title", ""),
            "body": issue_data.get("body", "")[:settings.MAX_ISSUE_BODY_CHARS]
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except json.JSONDecodeError as e:
        logger.error("triage_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("triage_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
