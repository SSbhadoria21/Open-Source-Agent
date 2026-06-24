"""
Project Health Agent — TRD §3.11

Fetches REAL metrics from the GitHub API, then passes only the computed
numbers to the LLM for narrative generation.  The LLM is never asked to
invent numeric values.
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from langchain_core.prompts import PromptTemplate
from app.services.github import github_client
from app.services.llm import llm

logger = logging.getLogger(__name__)


def _parse_period(period: str) -> datetime:
    """Convert a period string like '30d' or '7d' to a UTC datetime (start of window)."""
    period = period.strip().lower()
    if period.endswith("d"):
        days = int(period[:-1])
    elif period.endswith("w"):
        days = int(period[:-1]) * 7
    elif period.endswith("m"):
        days = int(period[:-1]) * 30
    else:
        days = 30  # default
    return datetime.now(timezone.utc) - timedelta(days=days)


def project_health(repo_url: str, period: str = "30d") -> Dict[str, Any]:
    """Aggregate real repository health metrics and generate a narrative summary."""
    try:
        since = _parse_period(period)
        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(days=14)

        # ── 1. Open issues ────────────────────────────────────────────────────
        open_issues_list = github_client.list_issues(repo_url, state="open")
        open_issues = len(open_issues_list)

        # ── 2. Closed issues in period ────────────────────────────────────────
        closed_list = github_client.list_issues(repo_url, state="closed", since=since)
        closed_this_period = len(closed_list)

        # ── 3. PRs in period ──────────────────────────────────────────────────
        all_prs = github_client.list_pull_requests(repo_url, state="closed", since=since)

        merged_prs = [pr for pr in all_prs if pr.get("is_merged") and pr.get("merged_at")]

        # Active contributors = unique PR authors with merges in period
        active_contributor_set = set()
        merge_durations = []
        for pr in merged_prs:
            if pr["merged_at"] and pr["merged_at"] >= since:
                active_contributor_set.add(pr["author"])
                if pr["created_at"]:
                    delta = (pr["merged_at"] - pr["created_at"]).total_seconds() / 86400.0
                    merge_durations.append(delta)

        active_contributors = len(active_contributor_set)
        avg_pr_merge_days = (
            round(sum(merge_durations) / len(merge_durations), 1)
            if merge_durations else 0.0
        )

        # ── 4. Stale open PRs (open > 14 days with no activity) ───────────────
        open_prs = github_client.list_pull_requests(repo_url, state="open")
        stale_prs = sum(
            1 for pr in open_prs
            if pr.get("updated_at") and pr["updated_at"] < stale_cutoff
        )

        # ── 5. LLM writes only the narrative text ────────────────────────────
        period_label = f"Last {period}"
        prompt = PromptTemplate.from_template(
            "You are an expert open source community manager. "
            "Write a concise 2-3 sentence health narrative for this repository "
            "based on the metrics below. Do NOT invent numbers — use only what is given.\n\n"
            "Repository: {repo_url}\n"
            "Period: {period_label}\n"
            "Open issues: {open_issues}\n"
            "Issues closed in period: {closed_this_period}\n"
            "Active contributors (unique PR authors): {active_contributors}\n"
            "Average PR merge time: {avg_pr_merge_days} days\n"
            "Stale open PRs (>14 days without activity): {stale_prs}\n\n"
            "Write only the narrative paragraph. No JSON, no bullet points."
        )
        chain = prompt | llm
        response = chain.invoke({
            "repo_url": repo_url,
            "period_label": period_label,
            "open_issues": open_issues,
            "closed_this_period": closed_this_period,
            "active_contributors": active_contributors,
            "avg_pr_merge_days": avg_pr_merge_days,
            "stale_prs": stale_prs,
        })
        narrative = response.content.strip()

        return {
            "period": period_label,
            "open_issues": open_issues,
            "closed_this_period": closed_this_period,
            "active_contributors": active_contributors,
            "avg_pr_merge_days": avg_pr_merge_days,
            "stale_prs": stale_prs,
            "narrative": narrative,
        }

    except json.JSONDecodeError as e:
        logger.error("health_agent: LLM returned invalid JSON: %s", e)
        return {"error": f"LLM response parsing failed: {e}"}
    except RuntimeError as e:
        # GitHub client not configured
        return {"error": str(e)}
    except Exception as e:
        logger.error("health_agent error: %s", e, exc_info=True)
        return {"error": str(e)}
