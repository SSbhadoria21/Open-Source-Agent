from github import Github, Auth
from typing import Dict, Any, List
from app.core.config import settings


class GitHubService:
    def __init__(self):
        token = settings.GITHUB_TOKEN
        if not token or token == "your_github_token_here":
            self.g = None
        else:
            auth = Auth.Token(token)
            self.g = Github(auth=auth)

    def _ensure_client(self):
        """Raise a helpful error if the GitHub client is not configured."""
        if self.g is None:
            raise RuntimeError(
                "GITHUB_TOKEN is not configured. "
                "Please set it in backend/.env to enable GitHub integration."
            )

    def get_repo_tree(self, repo_url: str) -> List[Dict[str, Any]]:
        """Fetch the file tree for a repository."""
        self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = self.g.get_repo(repo_name)

        # Get the default branch tree recursively
        default_branch = repo.default_branch
        tree = repo.get_git_tree(default_branch, recursive=True)

        return [{"path": item.path, "type": item.type} for item in tree.tree]

    def get_file_content(self, repo_url: str, file_path: str) -> str:
        """Fetch the raw content of a specific file."""
        self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = self.g.get_repo(repo_name)
        try:
            file_content = repo.get_contents(file_path)
            return file_content.decoded_content.decode('utf-8')
        except Exception:
            return ""

    def get_issue(self, issue_url: str) -> Dict[str, Any]:
        """Fetch issue details including body and state."""
        self._ensure_client()
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

    def get_pr_diff(self, pr_url: str) -> Dict[str, Any]:
        """Fetch PR details and file changes."""
        self._ensure_client()
        repo_name, pr_number = self._parse_pr_url(pr_url)
        repo = self.g.get_repo(repo_name)
        pr = repo.get_pull(int(pr_number))

        files = []
        for f in pr.get_files():
            files.append({
                "filename": f.filename,
                "status": f.status,
                "additions": f.additions,
                "deletions": f.deletions,
                "patch": (f.patch or "")[:2000],  # Limit patch size
            })

        return {
            "title": pr.title,
            "body": pr.body or "",
            "state": pr.state,
            "number": pr.number,
            "files": files[:20],  # Limit to 20 files
            "diff_summary": f"{pr.additions} additions, {pr.deletions} deletions across {pr.changed_files} files"
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

    def _parse_pr_url(self, pr_url: str) -> tuple[str, str]:
        """Extract 'owner/repo' and PR number from URL."""
        parts = pr_url.rstrip('/').split('/')
        repo_name = f"{parts[-4]}/{parts[-3]}"
        pr_number = parts[-1]
        return repo_name, pr_number


github_client = GitHubService()
