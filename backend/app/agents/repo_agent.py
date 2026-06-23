from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

def analyze_repository(repo_url: str) -> Dict[str, Any]:
    """Analyze a GitHub repository and return a structured orientation summary."""
    try:
        # Fetch file tree using GitHub service
        tree = github_client.get_repo_tree(repo_url)
        
        # Try to fetch README
        readme_content = github_client.get_file_content(repo_url, "README.md")
        
        # Build prompt
        prompt = PromptTemplate.from_template(
            "You are an expert AI software architect. "
            "Analyze this repository based on its file tree and README.\n\n"
            "File Tree:\n{tree_text}\n\n"
            "README Snippet:\n{readme_text}\n\n"
            "Provide a summary in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "tech_stack": {{"frontend": "...", "backend": "...", "database": "..."}},\n'
            '  "key_directories": [{{"path": "...", "description": "..."}}],\n'
            '  "entry_points": ["..."],\n'
            '  "summary": "a brief narrative summary of the codebase architecture, purpose, and tech stack"\n'
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )
        
        tree_text = "\n".join([f"- {item['path']} ({item['type']})" for item in tree[:200]]) # Limit to top 200 items
        readme_text = readme_content[:1500] if readme_content else "No README found."
        
        chain = prompt | llm
        
        response = chain.invoke({
            "tree_text": tree_text,
            "readme_text": readme_text
        })
        
        # Clean markdown code block syntax if present
        result_text = response.content.replace("```json", "").replace("```", "").strip()
        
        import json
        parsed_result = json.loads(result_text)
        return parsed_result
        
    except Exception as e:
        return {"error": str(e)}
