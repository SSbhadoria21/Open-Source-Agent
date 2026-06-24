import uuid
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


class RepoAnalyzeRequest(BaseModel):
    repo_url: str


class IssueExplainRequest(BaseModel):
    issue_url: str
    session_id: Optional[str] = None


class FixPlanRequest(BaseModel):
    issue_url: str
    repo_url: str
    session_id: Optional[str] = None


@router.post("/analyze-repo")
async def analyze_repo(request: RepoAnalyzeRequest):
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": "contributor",
        "intent": "analyze_repo",
        "payload": {"repo_url": request.repo_url},
        "session_id": str(uuid.uuid4()),
    }

    result = orchestrator.invoke(state)
    repo_summary = result.get("repo_summary", {})

    if "error" in repo_summary:
        return {"error": repo_summary["error"]}

    return {"message": "Repo analysis completed", "repo_summary": repo_summary}


@router.post("/explain-issue")
async def explain_issue(request: IssueExplainRequest):
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": "contributor",
        "intent": "explain_issue",
        "payload": {"issue_url": request.issue_url},
        "session_id": request.session_id or str(uuid.uuid4()),
    }

    result = orchestrator.invoke(state)
    issue_summary = result.get("issue_summary", {})

    if "error" in issue_summary:
        return {"error": issue_summary["error"]}

    return {"message": "Issue explanation completed", "issue_summary": issue_summary}


@router.post("/fix-plan")
async def fix_plan(request: FixPlanRequest):
    """Run the full 3-agent pipeline: Issue Agent → Code Agent → Fix Agent.
    Returns issue breakdown, affected files, and implementation plan.
    """
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": "contributor",
        "intent": "generate_fix",
        "payload": {"issue_url": request.issue_url, "repo_url": request.repo_url},
        "session_id": request.session_id or str(uuid.uuid4()),
    }

    result = orchestrator.invoke(state)

    # Check for errors in any stage
    issue_summary = result.get("issue_summary", {})
    affected_files = result.get("affected_files", [])
    fix_plan_data = result.get("fix_plan", {})

    for data in [issue_summary, fix_plan_data]:
        if isinstance(data, dict) and "error" in data:
            return {"error": data["error"]}

    return {
        "message": "Fix plan generated",
        "issue_summary": issue_summary,
        "affected_files": affected_files,
        "call_graph": result.get("call_graph", {}),
        "fix_plan": fix_plan_data,
    }
