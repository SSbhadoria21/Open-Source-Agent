import json
from typing import Dict, Any, List
from langchain_core.prompts import PromptTemplate
from app.services.llm import llm

def generate_fix(issue_summary: Dict[str, Any], affected_files: List[Dict[str, Any]], call_graph: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a step-by-step implementation plan with code snippets."""
    try:
        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Based on the issue summary and affected files, generate a step-by-step implementation plan with code snippets.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "Affected Files:\n{affected_files}\n\n"
            "Call Graph:\n{call_graph}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "steps": [\n'
            '    {{\n'
            '      "number": 1,\n'
            '      "title": "...",\n'
            '      "description": "...",\n'
            '      "snippet": "...",\n'
            '      "files_modified": ["..."]\n'
            '    }}\n'
            '  ],\n'
            '  "edge_cases": ["..."]\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "issue_summary": json.dumps(issue_summary),
            "affected_files": json.dumps(affected_files),
            "call_graph": json.dumps(call_graph)
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
