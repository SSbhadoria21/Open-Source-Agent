"""
Admin API endpoints — TRD §5.4, §5.5, §5.7, §5.8

All session IDs are generated per-request (uuid4).
Period and similarity_threshold params are properly threaded through.
"""
import uuid
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from app.agents.orchestrator import orchestrator

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Request / Response models ────────────────────────────────────────────────

class TriageRequest(BaseModel):
    issue_url: str
    repo_url: str = None


class DuplicateRequest(BaseModel):
    issue_url: str
    repo_url: str = None
    similarity_threshold: int = None   # falls back to settings default inside agent


class MatchRequest(BaseModel):
    issue_url: str
    repo_url: str = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/triage")
async def triage_issue(request: TriageRequest):
    """Classify and prioritize an incoming GitHub issue."""
    session_id = str(uuid.uuid4())
    try:
        state = orchestrator.invoke({
            "intent": "triage_issue",
            "session_id": session_id,
            "payload": {
                "issue_url": request.issue_url,
                "repo_url": request.repo_url,
            },
        })
        return {
            "message": "Issue triage complete.",
            "session_id": session_id,
            "triage_result": state.get("triage_result", {}),
        }
    except Exception as e:
        logger.error("admin/triage error: %s", e, exc_info=True)
        return {"error": str(e)}


@router.post("/detect-duplicate")
async def detect_duplicate(request: DuplicateRequest):
    """Detect whether an issue is a duplicate using Chroma embeddings."""
    session_id = str(uuid.uuid4())
    try:
        state = orchestrator.invoke({
            "intent": "detect_duplicate",
            "session_id": session_id,
            "payload": {
                "issue_url": request.issue_url,
                "repo_url": request.repo_url,
                # thread similarity_threshold — agent uses settings default if None
                "similarity_threshold": request.similarity_threshold,
            },
        })
        return {
            "message": "Duplicate detection complete.",
            "session_id": session_id,
            "duplicate_result": state.get("duplicate_result", {}),
        }
    except Exception as e:
        logger.error("admin/detect-duplicate error: %s", e, exc_info=True)
        return {"error": str(e)}


@router.post("/match-contributor")
async def match_contributor(request: MatchRequest):
    """Match contributors to an issue based on real PR history."""
    session_id = str(uuid.uuid4())
    try:
        state = orchestrator.invoke({
            "intent": "match_contributor",
            "session_id": session_id,
            "payload": {
                "issue_url": request.issue_url,
                "repo_url": request.repo_url,
            },
        })
        return {
            "message": "Contributor matching complete.",
            "session_id": session_id,
            "match_result": state.get("match_result", {}),
        }
    except Exception as e:
        logger.error("admin/match-contributor error: %s", e, exc_info=True)
        return {"error": str(e)}


@router.get("/health/{owner}/{repo}")
async def project_health(owner: str, repo: str, period: str = "30d"):
    """Fetch real project health metrics from GitHub and generate an AI narrative."""
    session_id = str(uuid.uuid4())
    repo_url = f"https://github.com/{owner}/{repo}"
    try:
        state = orchestrator.invoke({
            "intent": "project_health",
            "session_id": session_id,
            "payload": {
                "repo_url": repo_url,
                "period": period,       # threaded through to health_agent
            },
        })
        return {
            "message": "Health report generated.",
            "session_id": session_id,
            "health_report": state.get("health_report", {}),
        }
    except Exception as e:
        logger.error("admin/health error: %s", e, exc_info=True)
        return {"error": str(e)}
