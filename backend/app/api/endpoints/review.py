import uuid
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


class ReviewPRRequest(BaseModel):
    pr_url: str
    mode: str = "contributor"
    session_id: Optional[str] = None


@router.post("/pr")
async def review_pr(request: ReviewPRRequest):
    from app.agents.orchestrator import orchestrator

    state = {
        "user_role": request.mode,
        "intent": "review_pr",
        "payload": {
            "pr_url": request.pr_url,
            "mode": request.mode,   # wired to review_agent_node → review_pr(mode=...)
        },
        "session_id": request.session_id or str(uuid.uuid4()),
    }

    result = orchestrator.invoke(state)
    pr_review = result.get("pr_review", {})

    if isinstance(pr_review, dict) and "error" in pr_review:
        return {"error": pr_review["error"]}

    # Group issues by type for frontend consumption
    all_issues = pr_review.get("issues", [])
    grouped = {
        "Bugs": [i for i in all_issues if i.get("type") == "Bug"],
        "Security": [i for i in all_issues if i.get("type") == "Security"],
        "Style": [i for i in all_issues if i.get("type") == "Style"],
        "Tests": [i for i in all_issues if i.get("type") == "Test"],
    }

    return {
        "message": "PR review generated",
        "summary": pr_review.get("summary", ""),
        "grouped_issues": grouped,
        "tests": pr_review.get("tests", {}),
        "raw": pr_review,
    }
