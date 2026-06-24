"""
Repo Agent — TRD §3.2

Analyzes a GitHub repository structure and produces an orientation summary.
Tries multiple common README filename variants.
All size limits are read from settings — no hardcoded values.
"""
import json
import logging
from typing import Dict, Any

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm
from app.core.config import settings

logger = logging.getLogger(__name__)

# Common README filename variants to try in order
_README_CANDIDATES = [
    "README.md",
    "Readme.md",
    "readme.md",
    "README.rst",
    "README.txt",
    "docs/README.md",
]


def analyze_repository(repo_url: str) -> Dict[str, Any]:
    """Analyze a GitHub repository and return a structured orientation summary."""
    try:
        # ── 1. Fetch file tree ────────────────────────────────────────────────
        tree = github_client.get_repo_tree(repo_url)

        # ── 2. Find README — try multiple filename variants ───────────────────
        readme_content = ""
        for candidate in _README_CANDIDATES:
            content = github_client.get_file_content(repo_url, candidate)
            if content:
                readme_content = content
                logger.debug("repo_agent: found README at %s", candidate)
                break

        # ── 3. Build prompt with settings-controlled limits ───────────────────
        tree_text = "\n".join(
            [f"- {item['path']} ({item['type']})" for item in tree[:settings.MAX_TREE_ITEMS]]
        )
        readme_text = (
            readme_content[:settings.MAX_README_CHARS]
            if readme_content
            else "No README found."
        )

        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Analyze this repository based on its file tree and README.\n\n"
            "File Tree:\n{tree_text}\n\n"
            "README Snippet:\n{readme_text}\n\n"
            "Provide a summary in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "tech_stack": {{"frontend": "...", "backend": "...", "database": "..."}},\n'
            '  "key_directories": [{{"path": "...", "description": "..."}}],\n'
            '  "entry_points": ["..."],\n'
            '  "summary": "a brief narrative summary of the codebase architecture, purpose, and tech stack"\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )

        chain = prompt | llm
        response = chain.invoke({"tree_text": tree_text, "readme_text": readme_text})

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)

    except json.JSONDecodeError as e:
        logger.error("repo_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("repo_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
