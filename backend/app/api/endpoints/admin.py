from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class TriageRequest(BaseModel):
    issue_url: str
    repo_url: str


class DetectDuplicateRequest(BaseModel):
    issue_url: str
    repo_url: str
    similarity_threshold: int = 85


@router.post("/triage")
async def triage_issue(request: TriageRequest):
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": "admin",
        "intent": "triage_issue",
        "payload": {"issue_url": request.issue_url, "repo_url": request.repo_url},
        "session_id": "admin_session",
    }

    result = orchestrator.invoke(state)
    triage_result = result.get("triage_result", {})

    if isinstance(triage_result, dict) and "error" in triage_result:
        return {"error": triage_result["error"]}

    return {"message": "Issue triaged", "triage_result": triage_result}


@router.post("/detect-duplicate")
async def detect_duplicate(request: DetectDuplicateRequest):
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": "admin",
        "intent": "detect_duplicate",
        "payload": {
            "issue_url": request.issue_url,
            "repo_url": request.repo_url,
            "threshold": request.similarity_threshold,
        },
        "session_id": "admin_session",
    }

    result = orchestrator.invoke(state)
    duplicate_result = result.get("duplicate_result", {})

    if isinstance(duplicate_result, dict) and "error" in duplicate_result:
        return {"error": duplicate_result["error"]}

    return {"message": "Duplicate detection run", "duplicate_result": duplicate_result}


@router.get("/health/{repo_full_name:path}")
async def project_health(repo_full_name: str, period: str = "30d"):
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": "admin",
        "intent": "project_health",
        "payload": {"repo_url": repo_full_name, "period": period},
        "session_id": "admin_session",
    }

    result = orchestrator.invoke(state)
    health_report = result.get("health_report", {})

    if isinstance(health_report, dict) and "error" in health_report:
        return {"error": health_report["error"]}

    return {"message": "Project health retrieved", "health_report": health_report}
