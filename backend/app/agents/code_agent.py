"""
Code Agent — TRD §3.4

Strategy (two LLM calls):
  1. Pass issue summary + file tree → LLM nominates up to MAX_AFFECTED_FILES candidates.
  2. Fetch real content of nominated files.
  3. Pass real file contents → LLM extracts call graph.

All size limits read from settings — no hardcoded values.
"""
import json
import logging
from typing import Dict, Any, List

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def trace_code(repo_url: str, issue_summary: Dict[str, Any]) -> Dict[str, Any]:
    """Identify files affected by an issue and extract the real call graph."""
    try:
        # ── 1. Fetch file tree ────────────────────────────────────────────────
        tree = github_client.get_repo_tree(repo_url)
        tree_text = "\n".join(
            [f"- {item['path']} ({item['type']})" for item in tree[:settings.MAX_CODE_AGENT_TREE_ITEMS]]
        )

        # ── 2. First LLM call: nominate candidate files ───────────────────────
        nominate_prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Based on the issue summary and repository file tree, nominate up to {max_files} "
            "files most likely to need modification to resolve this issue.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "File Tree:\n{tree_text}\n\n"
            "Return ONLY valid JSON:\n"
            "{{\"candidates\": [{{\"path\": \"...\", \"reason\": \"...\"}}]}}"
        )

        chain1 = nominate_prompt | llm
        response1 = chain1.invoke({
            "issue_summary": json.dumps(issue_summary),
            "tree_text": tree_text,
            "max_files": settings.MAX_AFFECTED_FILES,
        })
        result1_text = response1.content.replace("```json", "").replace("```", "").strip()
        candidates = json.loads(result1_text).get("candidates", [])[:settings.MAX_AFFECTED_FILES]

        # ── 3. Fetch real content of nominated files ───────────────────────────
        file_contents: Dict[str, str] = {}
        for candidate in candidates:
            path = candidate.get("path", "")
            if path:
                content = github_client.get_file_content(repo_url, path)
                if content:
                    file_contents[path] = content[:2000]  # cap per-file content

        # ── 4. Second LLM call: extract call graph from real file contents ─────
        if file_contents:
            files_text = "\n\n".join(
                [f"=== {path} ===\n{content}" for path, content in file_contents.items()]
            )
            callgraph_prompt = PromptTemplate.from_template(
                "You are an expert AI software architect. "
                "Given the real file contents below and the issue summary, "
                "map the call graph / dependency chain relevant to the issue.\n\n"
                "Issue Summary:\n{issue_summary}\n\n"
                "File Contents:\n{files_text}\n\n"
                "Return ONLY valid JSON:\n"
                "{{\"entry\": \"...\", \"flow\": [\"step1 → step2 → ...\", ...]}}"
            )
            chain2 = callgraph_prompt | llm
            response2 = chain2.invoke({
                "issue_summary": json.dumps(issue_summary),
                "files_text": files_text[:4000],  # limit total context
            })
            result2_text = response2.content.replace("```json", "").replace("```", "").strip()
            call_graph = json.loads(result2_text)
        else:
            call_graph = {"entry": "unknown", "flow": ["Could not fetch file contents."]}

        return {
            "affected_files": candidates,
            "call_graph": call_graph,
            "file_contents": file_contents,  # passed to fix_agent via AgentState
        }

    except json.JSONDecodeError as e:
        logger.error("code_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("code_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
