"""
Repository documentation and contribution guidance loader.
Fetches relevant markdown files (CONTRIBUTING, README, docs, templates)
and sample merged PRs / closed good first issues using the existing GitHub client.
"""
import re
import logging
from typing import List, Optional, Callable
from app.services.github import github_client
from app.rag.models import DocFile

logger = logging.getLogger(__name__)

# Max docs to fetch to keep indexing fast and stay well within GitHub limits
MAX_DOC_FILES = 25
MAX_MERGED_PRS = 15
MAX_GOOD_FIRST_ISSUES = 15


def _is_contributing_file(path: str) -> bool:
    name = path.lower()
    return name in [
        "contributing.md",
        ".github/contributing.md",
        "docs/contributing.md",
        "contributing.rst",
    ] or bool(re.search(r"(^|/)contributing(\.md|\.rst)?$", name))


def _is_readme_file(path: str) -> bool:
    name = path.lower()
    return name in ["readme.md", "docs/readme.md", "readme.rst"] or bool(
        re.search(r"^readme(\.md|\.rst)?$", name)
    )


def _is_code_of_conduct(path: str) -> bool:
    name = path.lower()
    return "code_of_conduct" in name and (name.endswith(".md") or name.endswith(".rst"))


def _is_template_file(path: str) -> bool:
    name = path.lower()
    return (
        name.startswith(".github/issue_template")
        or name.startswith(".github/pull_request_template")
        or name.endswith("pull_request_template.md")
        or name.endswith("issue_template.md")
    )


def _is_docs_file(path: str) -> bool:
    name = path.lower()
    return (name.startswith("docs/") or name.startswith("documentation/")) and (
        name.endswith(".md") or name.endswith(".mdx")
    )


def load_repo_documents(
    repo_url: str,
    on_progress: Optional[Callable[[str, str, int, int], None]] = None,
) -> List[DocFile]:
    """
    Fetch markdown documentation and reference contributions for a GitHub repository.
    
    Args:
        repo_url: Full URL or 'owner/repo' of the target repository.
        on_progress: Optional callback fn(stage, message, current, total).
    
    Returns:
        List of DocFile objects with file content and canonical GitHub source URL.
    """
    repo_name = github_client._parse_repo_name(repo_url)
    default_branch = "main"
    documents: List[DocFile] = []

    if on_progress:
        on_progress("indexing_docs", f"Scanning repository tree for {repo_name}...", 0, 0)

    repo = None
    try:
        g = github_client._ensure_client()
        repo = g.get_repo(repo_name)
        default_branch = repo.default_branch or "main"
    except Exception as e:
        logger.warning("loader: failed to fetch repo object for %s: %s", repo_name, e)
        # Fallback branch detection
        for test_b in ["main", "master"]:
            try:
                import urllib.request
                test_url = f"https://raw.githubusercontent.com/{repo_name}/{test_b}/README.md"
                req = urllib.request.Request(test_url, headers={"User-Agent": "MenteeAgent/1.0"})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        default_branch = test_b
                        break
            except Exception:
                pass

    # ── 1. Discover relevant files from the git tree ──────────────────────────
    try:
        tree = github_client.get_repo_tree(repo_url)
    except Exception as e:
        logger.warning("loader: could not fetch repo tree for %s: %s", repo_name, e)
        tree = []

    blob_paths = [
        item["path"]
        for item in tree
        if item.get("type") == "blob" and isinstance(item.get("path"), str)
    ]

    selected_paths: List[str] = []

    # Priority 1: Contributing guides
    contributing_paths = [p for p in blob_paths if _is_contributing_file(p)]
    selected_paths.extend(contributing_paths)

    # Priority 2: README
    readme_paths = [p for p in blob_paths if _is_readme_file(p) and p not in selected_paths]
    selected_paths.extend(readme_paths)

    # Priority 3: Issue and PR templates
    template_paths = [p for p in blob_paths if _is_template_file(p) and p not in selected_paths]
    selected_paths.extend(template_paths)

    # Priority 4: Code of conduct
    coc_paths = [p for p in blob_paths if _is_code_of_conduct(p) and p not in selected_paths]
    selected_paths.extend(coc_paths)

    # Priority 5: Relevant docs/ markdown
    doc_paths = [p for p in blob_paths if _is_docs_file(p) and p not in selected_paths]
    # Keep highest-signal docs (development, setup, architecture, testing) first
    def _doc_priority(p: str) -> int:
        pl = p.lower()
        if any(k in pl for k in ["contribut", "develop", "setup", "install", "guide", "test", "build"]):
            return 0
        return 1

    doc_paths.sort(key=_doc_priority)
    remaining_slots = max(0, MAX_DOC_FILES - len(selected_paths))
    selected_paths.extend(doc_paths[:remaining_slots])

    total_files = len(selected_paths)
    logger.info("loader: found %d candidate documentation files in %s", total_files, repo_name)

    # ── 2. Fetch file contents ───────────────────────────────────────────────
    for idx, path in enumerate(selected_paths, start=1):
        if on_progress:
            on_progress("indexing_docs", f"Fetching {path} ({idx}/{total_files})", idx, total_files)

        try:
            content = github_client.get_file_content(repo_url, path)
            if content and content.strip():
                source_url = f"https://github.com/{repo_name}/blob/{default_branch}/{path}"
                doc_type = "template" if _is_template_file(path) else "guide"
                documents.append(
                    DocFile(
                        file_path=path,
                        content=content,
                        source_url=source_url,
                        doc_type=doc_type,
                    )
                )
        except Exception as e:
            logger.warning("loader: error fetching file %s: %s", path, e)

    # ── 3. Fetch sample merged PRs ───────────────────────────────────────────
    if repo:
        try:
            if on_progress:
                on_progress("indexing_docs", "Fetching sample merged PRs...", len(documents), total_files)

            pulls = repo.get_pulls(state="closed", sort="updated", direction="desc")
            pr_count = 0
            for p in pulls:
                if p.merged_at:
                    body = (p.body or "").strip()
                    pr_url = p.html_url or f"https://github.com/{repo_name}/pull/{p.number}"
                    author = p.user.login if p.user else "contributor"
                    md_content = (
                        f"# Merged Pull Request #{p.number}: {p.title}\n\n"
                        f"- Author: @{author}\n"
                        f"- Merged: {p.merged_at}\n\n"
                        f"## PR Description\n{body[:1500] if body else 'No description provided.'}\n"
                    )
                    documents.append(
                        DocFile(
                            file_path=f"prs/merged_pr_{p.number}.md",
                            content=md_content,
                            source_url=pr_url,
                            doc_type="merged_pr",
                        )
                    )
                    pr_count += 1
                    if pr_count >= MAX_MERGED_PRS:
                        break
        except Exception as e:
            logger.warning("loader: could not fetch merged PRs for %s: %s", repo_name, e)

    # ── 4. Fetch sample closed 'good first issue's ───────────────────────────
    if repo:
        try:
            if on_progress:
                on_progress("indexing_docs", "Fetching sample good first issues...", len(documents), total_files)

            issues = repo.get_issues(state="closed", labels=["good first issue"], sort="updated", direction="desc")
            issue_count = 0
            for iss in issues:
                if iss.pull_request:
                    continue
                body = (iss.body or "").strip()
                iss_url = iss.html_url or f"https://github.com/{repo_name}/issues/{iss.number}"
                labels_str = ", ".join([l.name for l in iss.labels])
                md_content = (
                    f"# Closed Good First Issue #{iss.number}: {iss.title}\n\n"
                    f"- Labels: {labels_str}\n"
                    f"- Closed: {iss.closed_at}\n\n"
                    f"## Issue Description\n{body[:1500] if body else 'No description provided.'}\n"
                )
                documents.append(
                    DocFile(
                        file_path=f"issues/good_first_issue_{iss.number}.md",
                        content=md_content,
                        source_url=iss_url,
                        doc_type="good_first_issue",
                    )
                )
                issue_count += 1
                if issue_count >= MAX_GOOD_FIRST_ISSUES:
                    break
        except Exception as e:
            logger.warning("loader: could not fetch good first issues for %s: %s", repo_name, e)

    logger.info("loader: loaded %d total documents for %s", len(documents), repo_name)
    return documents
