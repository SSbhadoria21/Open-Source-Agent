from github import Github, Auth, GithubException
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class GitHubService:
    """GitHub API client with lazy init, token pooling, and all TRD-required methods."""

    def __init__(self):
        # Populated lazily on first _ensure_client() call
        self._clients: List[Github] = []
        self._initialized = False

    def _initialize(self):
        """Build the token pool from settings. Called once on first use."""
        if self._initialized:
            return

        tokens = list(settings.GITHUB_TOKENS)
        # Fall back to legacy single-token if pool is empty
        if not tokens and settings.GITHUB_TOKEN and settings.GITHUB_TOKEN not in ("", "your_github_token_here"):
            tokens = [settings.GITHUB_TOKEN]

        if not tokens:
            self._clients = []
        else:
            for tok in tokens:
                auth = Auth.Token(tok)
                self._clients.append(Github(auth=auth))

        self._initialized = True

    def _ensure_client(self) -> Github:
        """Return the GitHub client with the highest remaining rate limit."""
        self._initialize()
        if not self._clients:
            raise RuntimeError(
                "No GitHub token configured. "
                "Set GITHUB_TOKENS (comma-separated pool) or GITHUB_TOKEN in backend/.env."
            )

        if len(self._clients) == 1:
            return self._clients[0]

        # Pick token with the most remaining quota
        best = self._clients[0]
        best_remaining = -1
        for client in self._clients:
            try:
                remaining = client.get_rate_limit().core.remaining
                if remaining > best_remaining:
                    best_remaining = remaining
                    best = client
            except GithubException:
                continue
        return best

    # ─── Parsing helpers ──────────────────────────────────────────────────────

    def _parse_repo_name(self, repo_url: str) -> str:
        """Extract 'owner/repo' from a GitHub URL or bare 'owner/repo' string."""
        if "github.com" in repo_url:
            parts = repo_url.rstrip("/").split("/")
            return f"{parts[-2]}/{parts[-1]}"
        return repo_url.strip("/")

    def _parse_issue_url(self, issue_url: str):
        parts = issue_url.rstrip("/").split("/")
        return f"{parts[-4]}/{parts[-3]}", parts[-1]

    def _parse_pr_url(self, pr_url: str):
        parts = pr_url.rstrip("/").split("/")
        return f"{parts[-4]}/{parts[-3]}", parts[-1]

    # ─── Repo / file tree ─────────────────────────────────────────────────────

    def get_repo_tree(self, repo_url: str) -> List[Dict[str, Any]]:
        """Fetch the recursive file tree for a repository."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        tree = repo.get_git_tree(repo.default_branch, recursive=True)
        return [{"path": item.path, "type": item.type} for item in tree.tree]

    def get_file_content(self, repo_url: str, file_path: str) -> str:
        """Fetch the raw UTF-8 content of a specific file. Returns '' on missing."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        try:
            content = repo.get_contents(file_path)
            return content.decoded_content.decode("utf-8")
        except Exception:
            return ""

    # ─── Issues ───────────────────────────────────────────────────────────────

    def get_issue(self, issue_url: str) -> Dict[str, Any]:
        """Fetch issue details including body, state, and labels."""
        g = self._ensure_client()
        repo_name, issue_number = self._parse_issue_url(issue_url)
        repo = g.get_repo(repo_name)
        issue = repo.get_issue(int(issue_number))
        return {
            "title": issue.title,
            "body": issue.body or "",
            "state": issue.state,
            "labels": [label.name for label in issue.labels],
            "number": issue.number,
            "repo_full_name": repo_name,
            "created_at": issue.created_at,
        }

    def list_issues(
        self,
        repo_url: str,
        state: str = "open",
        since: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """List issues for a repo. state='open'|'closed'|'all'. since filters by update time."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        kwargs: Dict[str, Any] = {"state": state}
        if since:
            kwargs["since"] = since
        issues = repo.get_issues(**kwargs)

        result = []
        for issue in issues:
            # PyGithub returns PRs mixed in with issues — filter them out
            if issue.pull_request:
                continue
            result.append({
                "number": issue.number,
                "title": issue.title,
                "state": issue.state,
                "labels": [l.name for l in issue.labels],
                "created_at": issue.created_at,
                "closed_at": issue.closed_at,
                "updated_at": issue.updated_at,
            })
        return result

    def get_recent_issues_with_labels(self, repo_url: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch recent issues that have at least one label (for few-shot examples)."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        issues = repo.get_issues(state="all")
        result = []
        count = 0
        for issue in issues:
            if issue.pull_request:
                continue
            if issue.labels:
                result.append({
                    "number": issue.number,
                    "title": issue.title,
                    "labels": [l.name for l in issue.labels],
                })
                count += 1
                if count >= limit:
                    break
        return result

    # ─── Pull Requests ────────────────────────────────────────────────────────

    def get_pr_diff(self, pr_url: str) -> Dict[str, Any]:
        """Fetch PR details and per-file diffs."""
        g = self._ensure_client()
        repo_name, pr_number = self._parse_pr_url(pr_url)
        repo = g.get_repo(repo_name)
        pr = repo.get_pull(int(pr_number))

        files = []
        for f in pr.get_files():
            files.append({
                "filename": f.filename,
                "status": f.status,
                "additions": f.additions,
                "deletions": f.deletions,
                "patch": (f.patch or "")[:settings.MAX_PR_PATCH_CHARS],
            })

        return {
            "title": pr.title,
            "body": pr.body or "",
            "state": pr.state,
            "number": pr.number,
            "author": pr.user.login if pr.user else "unknown",
            "repo_full_name": repo_name,
            "files": files[:settings.MAX_PR_FILES],
            "diff_summary": (
                f"{pr.additions} additions, {pr.deletions} deletions "
                f"across {pr.changed_files} files"
            ),
        }

    def list_pull_requests(
        self,
        repo_url: str,
        state: str = "open",
        since: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """List pull requests. state='open'|'closed'. Filters by updated_at >= since if provided."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        pulls = repo.get_pulls(state=state, sort="updated", direction="desc")

        result = []
        for pr in pulls:
            if since and pr.updated_at < since:
                # Since we sort by updated desc, once we see older ones we can stop
                break
            result.append({
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "author": pr.user.login if pr.user else "unknown",
                "created_at": pr.created_at,
                "updated_at": pr.updated_at,
                "merged_at": pr.merged_at,
                "is_merged": pr.merged,
            })
        return result

    def get_merged_prs(self, username: str, repo_url: str) -> List[Dict[str, Any]]:
        """Fetch merged PRs authored by username in the given repo."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        pulls = repo.get_pulls(state="closed", sort="updated", direction="desc")

        merged = []
        for pr in pulls:
            if pr.user and pr.user.login == username and pr.merged:
                changed_files = []
                try:
                    changed_files = [f.filename for f in pr.get_files()][:20]
                except GithubException:
                    pass
                merged.append({
                    "number": pr.number,
                    "title": pr.title,
                    "merged_at": pr.merged_at,
                    "labels": [l.name for l in pr.labels],
                    "files": changed_files,
                })
            if len(merged) >= 20:
                break
        return merged

    # ─── Labels ───────────────────────────────────────────────────────────────

    def get_repo_labels(self, repo_url: str) -> List[Dict[str, str]]:
        """Fetch all labels defined in the repo."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        return [{"name": label.name, "color": label.color} for label in repo.get_labels()]

    # ─── Comments / label application (for webhook chain) ────────────────────

    def create_issue_comment(self, repo_url: str, issue_number: int, body: str) -> None:
        """Post a comment on a GitHub issue."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        repo.get_issue(issue_number).create_comment(body)

    def add_labels_to_issue(
        self, repo_url: str, issue_number: int, labels: List[str]
    ) -> None:
        """Apply labels to a GitHub issue (labels must already exist in the repo)."""
        g = self._ensure_client()
        repo_name = self._parse_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        repo.get_issue(issue_number).add_to_labels(*labels)


github_client = GitHubService()
