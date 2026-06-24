"""
Fix Agent — TRD §3.5

Receives real file contents (fetched by Code Agent) and generates a
grounded, numbered implementation plan with code snippets.
"""
import json
import logging
from typing import Dict, Any, List

from langchain_core.prompts import PromptTemplate
from app.services.llm import llm

logger = logging.getLogger(__name__)


def generate_fix(
    issue_summary: Dict[str, Any],
    affected_files: List[Dict[str, Any]],
    call_graph: Dict[str, Any],
    file_contents: Dict[str, str] = None,
) -> Dict[str, Any]:
    """Generate a step-by-step implementation plan grounded in real file content."""
    try:
        # Build file content section for prompt
        if file_contents:
            files_section = "\n\n".join(
                [f"=== {path} ===\n{content[:1500]}" for path, content in file_contents.items()]
            )
        else:
            # Fall back to just the affected file paths
            files_section = "\n".join(
                [f"- {f.get('path', '')} ({f.get('reason', '')})" for f in affected_files]
            )
            files_section = "(File contents unavailable — using path list only)\n" + files_section

        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Generate a step-by-step implementation plan with code snippets. "
            "Base your snippets on the REAL file contents provided — do not invent "
            "function names or imports that don't exist in the shown code.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "Call Graph:\n{call_graph}\n\n"
            "Affected Files (real content):\n{files_section}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "steps": [\n'
            "    {{\n"
            '      "number": 1,\n'
            '      "title": "...",\n'
            '      "description": "...",\n'
            '      "snippet": "...",\n'
            '      "files_modified": ["..."]\n'
            "    }}\n"
            "  ],\n"
            '  "edge_cases": ["..."]\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )

        chain = prompt | llm
        response = chain.invoke({
            "issue_summary": json.dumps(issue_summary),
            "call_graph": json.dumps(call_graph),
            "files_section": files_section,
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)

    except json.JSONDecodeError as e:
        logger.error("fix_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except Exception as e:
        logger.error("fix_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
