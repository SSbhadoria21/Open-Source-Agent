"""
Fix Agent — TRD §3.5 & RAG Integration

Receives real file contents (from Code Agent) and retrieved documentation context
(from RAG retriever) to generate a grounded, numbered implementation plan
with code snippets, documentation citations ([file_path]), and sources.
"""
import json
import logging
from typing import Dict, Any, List, Optional

from langchain_core.prompts import PromptTemplate
from app.services.llm import llm

logger = logging.getLogger(__name__)


def generate_fix(
    issue_summary: Dict[str, Any],
    affected_files: List[Dict[str, Any]],
    call_graph: Dict[str, Any],
    file_contents: Optional[Dict[str, str]] = None,
    retrieved_context: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Generate a step-by-step implementation plan grounded in real file content and repo docs."""
    try:
        # Build file content section for prompt
        if file_contents:
            files_section = "\n\n".join(
                [f"=== {path} ===\n{content[:1500]}" for path, content in file_contents.items()]
            )
        else:
            files_section = "\n".join(
                [f"- {f.get('path', '')} ({f.get('reason', '')})" for f in affected_files]
            )
            files_section = "(File contents unavailable — using path list only)\n" + files_section

        # Build retrieved documentation section for prompt
        unique_sources: Dict[str, Dict[str, str]] = {}
        if retrieved_context:
            context_blocks: List[str] = []
            for item in retrieved_context:
                fp = item.get("file_path", "repo_docs")
                heading = f" > {item.get('heading')}" if item.get("heading") else ""
                url = item.get("source_url", "")
                if fp and fp not in unique_sources:
                    unique_sources[fp] = {"file_path": fp, "source_url": url}
                context_blocks.append(
                    f"--- Source: [{fp}]{heading} ---\n{item.get('text', '')}"
                )
            docs_section = "\n\n".join(context_blocks)
        else:
            docs_section = "No specific repository documentation was retrieved. Note: specific repository conventions are not found in repo docs."

        prompt = PromptTemplate.from_template(
            "You are an expert AI open-source contributor and software architect.\n"
            "Generate a step-by-step implementation plan with code snippets.\n\n"
            "CRITICAL REPOSITORY GUIDANCE RULES:\n"
            "1. Ground your plan in the RETRIEVED REPOSITORY DOCUMENTATION below. Treat it as your primary source for "
            "contribution rules, development setup, testing commands, branching strategy, and PR conventions.\n"
            "2. Cite documentation sources directly in your step titles or descriptions using bracket notation, e.g. [CONTRIBUTING.md], [docs/setup.md].\n"
            "3. If a convention, testing tool, or setup requirement is NOT present in the retrieved documentation, explicitly state 'not found in repo docs' rather than guessing or inventing conventions.\n"
            "4. Base code snippets on the REAL file contents provided — do not invent function names, class names, or imports that don't exist in the shown code.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "Call Graph:\n{call_graph}\n\n"
            "Retrieved Repository Documentation:\n{docs_section}\n\n"
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
            '  "edge_cases": ["..."],\n'
            '  "sources": [\n'
            "    {{\n"
            '      "file_path": "...",\n'
            '      "source_url": "..."\n'
            "    }}\n"
            "  ]\n"
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )

        chain = prompt | llm
        response = chain.invoke({
            "issue_summary": json.dumps(issue_summary),
            "call_graph": json.dumps(call_graph),
            "docs_section": docs_section,
            "files_section": files_section,
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        result_json = json.loads(result_text)

        # Ensure sources list is fully resolved and populated
        extracted_sources = result_json.get("sources", [])
        resolved_sources = []
        seen_paths = set()

        for s in extracted_sources:
            if isinstance(s, dict):
                fp = s.get("file_path", "")
                # Always prefer ground-truth retrieved source URL
                url = unique_sources.get(fp, {}).get("source_url") or s.get("source_url", "")
                if fp and url.startswith("http") and fp not in seen_paths:
                    seen_paths.add(fp)
                    resolved_sources.append({"file_path": fp, "source_url": url})

        # Add any retrieved context sources not explicitly cited in LLM output
        for fp, source_info in unique_sources.items():
            if fp not in seen_paths and source_info.get("source_url", "").startswith("http"):
                seen_paths.add(fp)
                resolved_sources.append(source_info)

        result_json["sources"] = resolved_sources
        return result_json

    except json.JSONDecodeError as e:
        logger.error("fix_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}", "sources": []}
    except Exception as e:
        logger.error("fix_agent error: %s", e, exc_info=True)
        return {"error": str(e), "sources": []}
