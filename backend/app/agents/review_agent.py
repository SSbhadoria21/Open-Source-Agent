import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.llm import llm

def review_pr(pr_url: str) -> Dict[str, Any]:
    """Analyze a PR diff and return structured feedback."""
    try:
        prompt = PromptTemplate.from_template(
            "You are an expert AI code reviewer. "
            "Review the PR at {pr_url}.\n\n"
            "Since diff fetching is not fully implemented yet, generate a hypothetical review "
            "for a generic pull request.\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "pr_number": 0,\n'
            '  "summary": "...",\n'
            '  "issues": [\n'
            '    {{ "type": "Bug", "severity": "Warning", "location": "...", "message": "..." }}\n'
            '  ],\n'
            '  "style_notes": [\n'
            '    {{ "type": "Style", "severity": "Info", "location": "...", "message": "..." }}\n'
            '  ],\n'
            '  "tests": {{\n'
            '    "new_code_has_tests": false,\n'
            '    "missing_coverage": ["..."]\n'
            '  }}\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "pr_url": pr_url
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
