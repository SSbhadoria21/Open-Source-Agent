from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class RepoAnalyzeRequest(BaseModel):
    repo_url: str

class IssueExplainRequest(BaseModel):
    issue_url: str
    session_id: str = None

class FixPlanRequest(BaseModel):
    issue_url: str
    repo_url: str
    session_id: str = None

@router.post("/analyze-repo")
async def analyze_repo(request: RepoAnalyzeRequest):
    from app.agents.orchestrator import orchestrator
    
    state = {
        "user_role": "contributor",
        "intent": "analyze_repo",
        "payload": {"repo_url": request.repo_url},
        "session_id": "test_session"
    }
    
    result = orchestrator.invoke(state)
    return {"message": "Repo analysis completed", "repo_summary": result.get("repo_summary")}

@router.post("/explain-issue")
async def explain_issue(request: IssueExplainRequest):
    from app.agents.orchestrator import orchestrator
    
    state = {
        "user_role": "contributor",
        "intent": "explain_issue",
        "payload": {"issue_url": request.issue_url},
        "session_id": request.session_id or "test_session"
    }
    
    result = orchestrator.invoke(state)
    return {"message": "Issue explanation completed", "issue_summary": result.get("issue_summary")}

@router.post("/fix-plan")
async def fix_plan(request: FixPlanRequest):
    from app.agents.orchestrator import orchestrator
    
    state = {
        "user_role": "contributor",
        "intent": "generate_fix",
        "payload": {"issue_url": request.issue_url, "repo_url": request.repo_url},
        "session_id": request.session_id or "test_session"
    }
    
    result = orchestrator.invoke(state)
    return {
        "message": "Fix plan generated",
        "issue_summary": result.get("issue_summary"),
        "affected_files": result.get("affected_files"),
        "fix_plan": result.get("fix_plan")
    }
