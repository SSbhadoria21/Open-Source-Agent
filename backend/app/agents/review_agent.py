"""
Review Agent — TRD §3.6

Supports two modes:
  - "contributor" (default): review the diff only.
  - "admin": additionally inject CONTRIBUTING.md and PR author's merge history
    per TRD F-S-01.

All size limits read from settings.
"""
import json
import logging
from typing import Dict, Any

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def review_pr(pr_url: str, mode: str = "contributor") -> Dict[str, Any]:
    """Analyze a PR diff and return structured feedback."""
    try:
        # ── 1. Fetch PR diff ──────────────────────────────────────────────────
        pr_data = github_client.get_pr_diff(pr_url)
        repo_url = f"https://github.com/{pr_data.get('repo_full_name', '')}"
        pr_author = pr_data.get("author", "")

        files_text = "\n".join([
            f"- {f['filename']} ({f['status']}, +{f['additions']}/-{f['deletions']})\n"
            f"  Patch:\n{f['patch'][:settings.MAX_PR_PATCH_CHARS]}"
            for f in pr_data.get("files", [])[:settings.MAX_PR_FILES]
        ])

        # ── 2. Admin-mode: additional context (F-S-01) ────────────────────────
        admin_context = ""
        if mode == "admin":
            # Contributing guidelines
            contributing = github_client.get_file_content(repo_url, "CONTRIBUTING.md")
            if not contributing:
                contributing = github_client.get_file_content(repo_url, "contributing.md")

            if contributing:
                admin_context += (
                    f"\n\nContribution Standards (CONTRIBUTING.md):\n"
                    f"{contributing[:1500]}"
                )

            # PR author's merge history
            if pr_author and pr_data.get("repo_full_name"):
                try:
                    merged_prs = github_client.get_merged_prs(pr_author, repo_url)
                    if merged_prs:
                        history_lines = [
                            f"  - PR #{p['number']}: {p['title']} ({p['merged_at']})"
                            for p in merged_prs[:5]
                        ]
                        admin_context += (
                            f"\n\nContributor History for @{pr_author} "
                            f"(last {len(merged_prs)} merged PRs):\n"
                            + "\n".join(history_lines)
                        )
                except Exception as e:
                    logger.warning("review_agent: could not fetch contributor history: %s", e)

        # ── 3. Build prompt ───────────────────────────────────────────────────
        mode_instruction = (
            "You are reviewing as a project admin — pay extra attention to whether the "
            "contribution follows the project's standards and the contributor's track record."
            if mode == "admin"
            else "You are reviewing as a pre-submission helper for the contributor."
        )

        prompt = PromptTemplate.from_template(
            "You are an expert AI code reviewer. {mode_instruction}\n"
            "Review the following pull request diff and provide detailed, actionable feedback.\n\n"
            "PR Title: {pr_title}\n"
            "PR Description: {pr_body}\n"
            "Diff Summary: {diff_summary}\n"
            "{admin_context}\n\n"
            "Changed Files:\n{files_text}\n\n"
            "Provide the response in JSON format exactly matching this structure:\n"
            "{{\n"
            '  "summary": "A brief summary of what this PR does",\n'
            '  "issues": [\n'
            "    {{ \"type\": \"Bug|Security|Style|Test\", \"severity\": \"High|Medium|Low\","
            " \"file\": \"filename:line\", \"desc\": \"description\", \"fix\": \"suggested fix\" }}\n"
            "  ],\n"
            '  "tests": {{\n'
            '    "new_code_has_tests": false,\n'
            '    "missing_coverage": ["area that needs tests"]\n'
            "  }}\n"
            "}}\n"
            "Return ONLY valid JSON without any markdown formatting."
        )

        chain = prompt | llm
        response = chain.invoke({
            "pr_title": pr_data.get("title", ""),
            "pr_body": pr_data.get("body", "")[:1000],
            "diff_summary": pr_data.get("diff_summary", ""),
            "files_text": files_text,
            "admin_context": admin_context,
            "mode_instruction": mode_instruction,
        })

        result_text = response.content.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)

    except json.JSONDecodeError as e:
        logger.error("review_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("review_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
