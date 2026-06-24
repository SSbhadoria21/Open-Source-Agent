"""
Webhook handler — TRD §5.8

Security:
  - HMAC-SHA256 signature verification (X-Hub-Signature-256) using
    settings.GITHUB_WEBHOOK_SECRET. Returns 401 on mismatch.

issues.opened chain:
  Triage Agent → Label Agent → Duplicate Agent
  → Post summary comment to issue
  → Apply suggested labels to issue
"""
import hashlib
import hmac
import json
import uuid
import logging
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from app.core.config import settings
from app.agents.triage_agent import triage_issue
from app.agents.label_agent import label_issue
from app.agents.duplicate_agent import detect_duplicate
from app.services.github import github_client

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_signature(payload_bytes: bytes, signature_header: str) -> bool:
    """Verify GitHub HMAC-SHA256 signature."""
    if not settings.GITHUB_WEBHOOK_SECRET:
        # If no secret is configured, skip verification (dev-mode only warning)
        logger.warning(
            "GITHUB_WEBHOOK_SECRET not configured — "
            "webhook signature verification is DISABLED. "
            "Set it in .env for production use."
        )
        return True

    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(
        key=settings.GITHUB_WEBHOOK_SECRET.encode(),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected}", signature_header)


async def _run_issue_chain(
    issue_url: str,
    repo_url: str,
    issue_number: int,
    session_id: str,
) -> None:
    """Background task: Triage → Label → Duplicate → comment + apply labels."""
    logger.info(
        "webhook chain start: session=%s issue=%s", session_id, issue_url
    )

    # ── 1. Triage ──────────────────────────────────────────────────────────────
    triage_result = triage_issue(issue_url)
    logger.info("webhook triage: %s", triage_result)

    # ── 2. Label ───────────────────────────────────────────────────────────────
    # Use triage output as issue_summary for label agent
    issue_summary_for_label = {
        "plain_summary": triage_result.get("affected_area", ""),
        "issue_type": triage_result.get("issue_type", ""),
        "priority": triage_result.get("priority", ""),
    }
    label_result = label_issue(repo_url, issue_summary_for_label)
    logger.info("webhook label: %s", label_result)

    # ── 3. Duplicate detection ─────────────────────────────────────────────────
    duplicate_result = detect_duplicate(issue_url, repo_url)
    logger.info("webhook duplicate: %s", duplicate_result)

    # ── 4. Apply labels to issue via GitHub API ────────────────────────────────
    suggested_labels = label_result.get("suggested_labels", [])
    if suggested_labels:
        try:
            github_client.add_labels_to_issue(repo_url, issue_number, suggested_labels)
            logger.info("webhook: applied labels %s to #%s", suggested_labels, issue_number)
        except Exception as e:
            logger.warning("webhook: could not apply labels: %s", e)

    # ── 5. Post a summary comment ──────────────────────────────────────────────
    comment_lines = [
        "## 🤖 AI Triage Summary",
        "",
        f"**Type:** {triage_result.get('issue_type', 'Unknown')}  ",
        f"**Priority:** {triage_result.get('priority', 'Unknown')}  ",
        f"**Affected Area:** {triage_result.get('affected_area', 'Unknown')}  ",
    ]

    if suggested_labels:
        comment_lines += ["", f"**Labels Applied:** {', '.join(suggested_labels)}"]

    if duplicate_result.get("is_duplicate"):
        comment_lines += [
            "",
            "⚠️ **Possible Duplicate Detected**",
            duplicate_result.get("draft_comment", ""),
        ]

    comment = "\n".join(comment_lines)
    try:
        github_client.create_issue_comment(repo_url, issue_number, comment)
        logger.info("webhook: posted summary comment to #%s", issue_number)
    except Exception as e:
        logger.warning("webhook: could not post comment: %s", e)


@router.post("/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive GitHub webhook events and dispatch to the appropriate chain."""
    payload_bytes = await request.body()

    # ── Signature verification ─────────────────────────────────────────────────
    signature = request.headers.get("X-Hub-Signature-256", "")
    if not _verify_signature(payload_bytes, signature):
        logger.warning("webhook: invalid signature from %s", request.client.host)
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    # ── Parse payload ──────────────────────────────────────────────────────────
    try:
        payload = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event_type = request.headers.get("X-GitHub-Event", "")
    action = payload.get("action", "")
    session_id = str(uuid.uuid4())

    logger.info("webhook: event=%s action=%s session=%s", event_type, action, session_id)

    # ── issues.opened: run full Triage → Label → Duplicate chain ──────────────
    if event_type == "issues" and action == "opened":
        issue = payload.get("issue", {})
        repo = payload.get("repository", {})

        issue_number = issue.get("number")
        repo_full_name = repo.get("full_name", "")
        if not issue_number or not repo_full_name:
            raise HTTPException(status_code=400, detail="Missing issue number or repo name.")

        issue_url = f"https://github.com/{repo_full_name}/issues/{issue_number}"
        repo_url = f"https://github.com/{repo_full_name}"

        background_tasks.add_task(
            _run_issue_chain,
            issue_url=issue_url,
            repo_url=repo_url,
            issue_number=issue_number,
            session_id=session_id,
        )

        return {
            "status": "accepted",
            "event": event_type,
            "action": action,
            "session_id": session_id,
            "message": "Triage chain queued in background.",
        }

    # ── pull_request.opened: queue for review (future extension) ──────────────
    if event_type == "pull_request" and action == "opened":
        return {
            "status": "accepted",
            "event": event_type,
            "action": action,
            "session_id": session_id,
            "message": "PR review via webhook not yet implemented.",
        }

    # ── Unhandled events ───────────────────────────────────────────────────────
    return {
        "status": "ignored",
        "event": event_type,
        "action": action,
        "session_id": session_id,
    }
