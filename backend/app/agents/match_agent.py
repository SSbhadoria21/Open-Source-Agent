import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

def match_contributor(issue_url: str) -> Dict[str, Any]:
    """Recommend the best contributors for a given issue."""
    try:
        issue_data = github_client.get_issue(issue_url)
        
        prompt = PromptTemplate.from_template(
            "You are an expert open source project manager. "
            "Based on the issue details, recommend what kind of contributor would be a good match. "
            "Assume a hypothetical pool of contributors with various skills.\n\n"
            "Issue Title: {title}\n"
            "Issue Body: {body}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "recommendations": [\n'
            '    {{\n'
            '      "rank": 1,\n'
            '      "username": "...",\n'
            '      "reason": "...",\n'
            '      "score": 90\n'
            '    }}\n'
            '  ],\n'
            '  "excluded": ["..."]\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "title": issue_data.get("title", ""),
            "body": issue_data.get("body", "")[:2000]
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
