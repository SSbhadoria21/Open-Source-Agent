import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.llm import llm

def label_issue(repo_url: str, issue_summary: Dict[str, Any]) -> Dict[str, Any]:
    """Suggest GitHub labels for a new issue or PR."""
    try:
        prompt = PromptTemplate.from_template(
            "You are an expert repository maintainer. "
            "Suggest GitHub labels for this issue based on its summary.\n\n"
            "Issue Summary:\n{issue_summary}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "suggested_labels": ["..."],\n'
            '  "confidence": {{"label1": 0.9, "label2": 0.8}}\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "issue_summary": json.dumps(issue_summary)
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
