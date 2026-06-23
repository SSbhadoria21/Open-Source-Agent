import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

def detect_duplicate(issue_url: str, repo_url: str) -> Dict[str, Any]:
    """Detect whether a new issue is a duplicate of an existing one."""
    try:
        issue_data = github_client.get_issue(issue_url)
        
        # In a real implementation, we would query ChromaDB for similar issues here.
        # For Phase 2, we simulate it by asking the LLM to identify similarities
        # based on mock candidates or just returning a placeholder structure.
        
        prompt = PromptTemplate.from_template(
            "You are an expert repository maintainer. "
            "Detect if this issue might be a duplicate based on common patterns.\n\n"
            "Issue Title: {title}\n"
            "Issue Body: {body}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "is_duplicate": false,\n'
            '  "similar_issues": [],\n'
            '  "recommended_action": "...",\n'
            '  "draft_comment": "..."\n'
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
