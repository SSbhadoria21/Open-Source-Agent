from github import Github, Auth
from typing import Dict, Any, List
from app.core.config import settings

class GitHubService:
    def __init__(self):
        auth = Auth.Token(settings.GITHUB_TOKEN)
        self.g = Github(auth=auth)

    def get_repo_tree(self, repo_url: str) -> List[Dict[str, Any]]:
        """Fetch the file tree for a repository."""
        repo_name = self._parse_repo_name(repo_url)
        repo = self.g.get_repo(repo_name)
        
        # Get the default branch tree recursively
        default_branch = repo.default_branch
        tree = repo.get_git_tree(default_branch, recursive=True)
        
        return [{"path": item.path, "type": item.type} for item in tree.tree]

    def get_file_content(self, repo_url: str, file_path: str) -> str:
        """Fetch the raw content of a specific file."""
        repo_name = self._parse_repo_name(repo_url)
        repo = self.g.get_repo(repo_name)
        try:
            file_content = repo.get_contents(file_path)
            return file_content.decoded_content.decode('utf-8')
        except Exception:
            return ""

    def get_issue(self, issue_url: str) -> Dict[str, Any]:
        """Fetch issue details including body and state."""
        repo_name, issue_number = self._parse_issue_url(issue_url)
        repo = self.g.get_repo(repo_name)
        issue = repo.get_issue(int(issue_number))
        
        return {
            "title": issue.title,
            "body": issue.body,
            "state": issue.state,
            "labels": [label.name for label in issue.labels],
            "number": issue.number
        }

    def _parse_repo_name(self, repo_url: str) -> str:
        """Extract 'owner/repo' from URL."""
        parts = repo_url.rstrip('/').split('/')
        return f"{parts[-2]}/{parts[-1]}"

    def _parse_issue_url(self, issue_url: str) -> tuple[str, str]:
        """Extract 'owner/repo' and issue number from URL."""
        parts = issue_url.rstrip('/').split('/')
        repo_name = f"{parts[-4]}/{parts[-3]}"
        issue_number = parts[-1]
        return repo_name, issue_number

github_client = GitHubService()
