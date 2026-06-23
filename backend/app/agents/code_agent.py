import json
from typing import Dict, Any, List
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

def trace_code(repo_url: str, issue_summary: Dict[str, Any]) -> Dict[str, Any]:
    """Identify files affected by an issue and trace the call graph."""
    try:
        tree = github_client.get_repo_tree(repo_url)
        tree_text = "\n".join([f"- {item['path']} ({item['type']})" for item in tree[:300]])
        
        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Based on the following repository file tree and issue summary, identify up to 5 files that will likely need to be modified to resolve the issue.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "File Tree:\n{tree_text}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "affected_files": [\n'
            '    {{ "path": "...", "reason": "..." }}\n'
            '  ],\n'
            '  "call_graph": {{\n'
            '    "entry": "...",\n'
            '    "flow": ["..."]\n'
            '  }}\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "issue_summary": json.dumps(issue_summary),
            "tree_text": tree_text
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
