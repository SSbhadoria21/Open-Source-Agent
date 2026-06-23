from fastapi import APIRouter, Request, BackgroundTasks
import hashlib
import hmac
import json
from app.core.config import settings

router = APIRouter()

@router.post("/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook endpoint to handle automated GitHub events (like issue creation, PR merge)
    """
    payload = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    event = request.headers.get("X-GitHub-Event")

    # In a real app, verify the signature with a WEBHOOK_SECRET here
    # if not verify_signature(payload, signature):
    #     raise HTTPException(status_code=403, detail="Invalid signature")

    data = json.loads(payload)

    # Example: automatically triage newly opened issues
    if event == "issues" and data.get("action") == "opened":
        issue_url = data["issue"]["html_url"]
        repo_url = data["repository"]["html_url"]
        
        # We process webhooks in background tasks so GitHub receives a quick 200 OK
        background_tasks.add_task(process_issue_opened, issue_url, repo_url)
        return {"message": "Issue opened event received, processing in background."}
        
    # Example: automatically review opened or synchronized PRs
    elif event == "pull_request" and data.get("action") in ["opened", "synchronize"]:
        pr_url = data["pull_request"]["html_url"]
        background_tasks.add_task(process_pr_opened, pr_url)
        return {"message": "PR event received, processing in background."}

    return {"message": f"Event {event} received but no automated action required."}

def process_issue_opened(issue_url: str, repo_url: str):
    from app.agents.orchestrator import orchestrator
    
    # Run Triage Agent automatically
    state = {
        "user_role": "admin",
        "intent": "triage_issue",
        "payload": {"issue_url": issue_url, "repo_url": repo_url},
        "session_id": "webhook_event"
    }
    orchestrator.invoke(state)

def process_pr_opened(pr_url: str):
    from app.agents.orchestrator import orchestrator
    
    # Run PR Review Agent automatically
    state = {
        "user_role": "admin",
        "intent": "review_pr",
        "payload": {"pr_url": pr_url},
        "session_id": "webhook_event"
    }
    orchestrator.invoke(state)
