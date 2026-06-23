import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm


def review_pr(pr_url: str) -> Dict[str, Any]:
    """Analyze a PR diff and return structured feedback grouped by category."""
    try:
        # Fetch actual PR diff from GitHub
        pr_data = github_client.get_pr_diff(pr_url)

        files_text = "\n".join([
            f"- {f['filename']} ({f['status']}, +{f['additions']}/-{f['deletions']})\n  Patch:\n{f['patch'][:500]}"
            for f in pr_data.get("files", [])[:10]
        ])

        prompt = PromptTemplate.from_template(
            "You are an expert AI code reviewer. "
            "Review the following pull request diff and provide detailed, actionable feedback.\n\n"
            "PR Title: {pr_title}\n"
            "PR Description: {pr_body}\n"
            "Diff Summary: {diff_summary}\n\n"
            "Changed Files:\n{files_text}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "summary": "A brief summary of what this PR does",\n'
            '  "issues": [\n'
            '    {{ "type": "Bug|Security|Style|Test", "severity": "High|Medium|Low", "file": "filename:line", "desc": "description of the issue", "fix": "suggested fix code" }}\n'
            '  ],\n'
            '  "tests": {{\n'
            '    "new_code_has_tests": false,\n'
            '    "missing_coverage": ["area that needs tests"]\n'
            '  }}\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )

        chain = prompt | llm
        response = chain.invoke({
            "pr_title": pr_data.get("title", ""),
            "pr_body": pr_data.get("body", "")[:1000],
            "diff_summary": pr_data.get("diff_summary", ""),
            "files_text": files_text,
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)

    except Exception as e:
        return {"error": str(e)}
