import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

def explain_issue(issue_url: str) -> Dict[str, Any]:
    """Fetch and simplify a GitHub issue."""
    try:
        issue_data = github_client.get_issue(issue_url)
        
        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Analyze the following GitHub issue and provide a simplified explanation.\n\n"
            "Issue Title: {title}\n"
            "Issue Body: {body}\n\n"
            "Classify the difficulty as Beginner, Intermediate, or Advanced.\n"
            "Beginner: UI-only changes, typo fixes, documentation updates, config changes.\n"
            "Intermediate: New feature with 2-5 files touched, minor API changes.\n"
            "Advanced: Architectural changes, security fixes, performance-critical code.\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "title": "...",\n'
            '  "plain_summary": "...",\n'
            '  "difficulty": "...",\n'
            '  "estimated_hours": 0,\n'
            '  "affected_areas": ["..."],\n'
            '  "labels_detected": ["..."]\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        
        response = chain.invoke({
            "title": issue_data.get("title", ""),
            "body": issue_data.get("body", "")[:2000] # truncate just in case
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
