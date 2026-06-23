import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

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
            "body": issue_data.get("body", "")[:2000]
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
