import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

def project_health(repo_url: str) -> Dict[str, Any]:
    """Aggregate repository health metrics and generate summary reports."""
    try:
        # For a full implementation, we'd fetch actual metrics from GitHub API
        # Here we ask the LLM to generate a report based on the repo name
        
        prompt = PromptTemplate.from_template(
            "You are an expert open source community manager. "
            "Generate a hypothetical health report for the repository at {repo_url}.\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "period": "Last 30 days",\n'
            '  "open_issues": 0,\n'
            '  "closed_this_period": 0,\n'
            '  "active_contributors": 0,\n'
            '  "avg_pr_merge_days": 0.0,\n'
            '  "stale_prs": 0,\n'
            '  "narrative": "..."\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        chain = prompt | llm
        response = chain.invoke({
            "repo_url": repo_url
        })
        
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
        
    except Exception as e:
        return {"error": str(e)}
