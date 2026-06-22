from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ReviewPRRequest(BaseModel):
    pr_url: str
    mode: str = "contributor"
    session_id: str = None

@router.post("/pr")
async def review_pr(request: ReviewPRRequest):
    from app.agents.orchestrator import orchestrator
    
    state = {
        "user_role": request.mode,
        "intent": "review_pr",
        "payload": {"pr_url": request.pr_url},
        "session_id": request.session_id or "test_session"
    }
    
    result = orchestrator.invoke(state)
    return {"message": "PR review generated", "pr_review": result.get("pr_review")}
