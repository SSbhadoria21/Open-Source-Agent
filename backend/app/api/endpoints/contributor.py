import uuid
import json
import asyncio
import logging
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

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


def _format_sse(event: str, data: Any) -> str:
    """Format data according to SSE specification."""
    payload = json.dumps(data, default=str)
    return f"event: {event}\ndata: {payload}\n\n"


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
    """Run the grounded 4-node pipeline: Issue Agent → Code Agent → Docs RAG → Fix Agent.
    Returns issue breakdown, affected files, call graph, retrieved context, and implementation plan.
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
    retrieved_context = result.get("retrieved_context", [])

    for data in [issue_summary, fix_plan_data]:
        if isinstance(data, dict) and "error" in data:
            return {"error": data["error"]}

    return {
        "message": "Fix plan generated",
        "issue_summary": issue_summary,
        "affected_files": affected_files,
        "call_graph": result.get("call_graph", {}),
        "fix_plan": fix_plan_data,
        "retrieved_context": retrieved_context,
    }


async def _stream_fix_plan(repo_url: str, issue_url: str, session_id: str):
    """
    Generator streaming real-time SSE events for the multi-agent contribution workflow.
    Emits events:
      - pipeline_start
      - agent_status (running/done for issue, code, docs, fix)
      - indexing_docs (start/progress/done)
      - retrieved_context (with sources)
      - complete / error
    """
    loop = asyncio.get_running_loop()
    event_queue: asyncio.Queue[Optional[tuple[str, Any]]] = asyncio.Queue()

    def emit(event: str, data: Any):
        loop.call_soon_threadsafe(event_queue.put_nowait, (event, data))

    def on_rag_progress(stage: str, message: str, current: int, total: int):
        status = "start" if current == 0 else "progress"
        emit("indexing_docs", {
            "status": status,
            "message": message,
            "current": current,
            "total": total,
        })

    def run_sync_pipeline():
        try:
            emit("pipeline_start", {
                "session_id": session_id,
                "repo_url": repo_url,
                "issue_url": issue_url,
            })

            # ── 1. Issue Agent ───────────────────────────────────────────────
            emit("agent_status", {
                "node": "issue",
                "name": "Issue Agent",
                "status": "running",
                "time": "analyzing...",
            })
            from app.agents.issue_agent import explain_issue
            issue_summary = explain_issue(issue_url)

            if isinstance(issue_summary, dict) and "error" in issue_summary:
                emit("agent_status", {"node": "issue", "name": "Issue Agent", "status": "error"})
                emit("error", {"error": issue_summary["error"]})
                return

            emit("agent_status", {
                "node": "issue",
                "name": "Issue Agent",
                "status": "done",
                "time": "done",
                "result": issue_summary,
            })

            # ── 2. Code Agent ────────────────────────────────────────────────
            emit("agent_status", {
                "node": "code",
                "name": "Code Agent",
                "status": "running",
                "time": "tracing...",
            })
            from app.agents.code_agent import trace_code
            code_result = trace_code(repo_url, issue_summary)

            if isinstance(code_result, dict) and "error" in code_result:
                emit("agent_status", {"node": "code", "name": "Code Agent", "status": "error"})
                emit("error", {"error": code_result["error"]})
                return

            affected_files = code_result.get("affected_files", [])
            call_graph = code_result.get("call_graph", {})
            file_contents = code_result.get("file_contents", {})

            emit("agent_status", {
                "node": "code",
                "name": "Code Agent",
                "status": "done",
                "time": "done",
                "result": {"affected_files": affected_files, "call_graph": call_graph},
            })

            # ── 3. Docs RAG Agent ────────────────────────────────────────────
            emit("agent_status", {
                "node": "docs",
                "name": "Docs RAG",
                "status": "running",
                "time": "indexing...",
            })
            emit("indexing_docs", {
                "status": "start",
                "message": f"Checking documentation index for {repo_url}...",
                "current": 0,
                "total": 100,
            })

            query_parts = []
            if issue_summary.get("title"):
                query_parts.append(issue_summary["title"])
            if issue_summary.get("plain_summary"):
                query_parts.append(issue_summary["plain_summary"])
            if issue_summary.get("affected_areas"):
                areas = issue_summary["affected_areas"]
                query_parts.append(f"Areas: {', '.join(areas) if isinstance(areas, list) else areas}")
            query_parts.append("contribute setup testing pull request guidelines")
            query_str = " | ".join(query_parts)

            from app.rag.retriever import retrieve
            retrieved = retrieve(
                query=query_str,
                repo=repo_url,
                on_progress=on_rag_progress,
            )

            emit("indexing_docs", {
                "status": "done",
                "message": f"Retrieved {len(retrieved)} relevant documentation chunks.",
                "current": len(retrieved),
                "total": len(retrieved),
            })

            sources_summary = [
                {
                    "file_path": c.get("file_path", ""),
                    "source_url": c.get("source_url", ""),
                    "heading": c.get("heading", ""),
                    "score": c.get("score", 0.0),
                }
                for c in retrieved
            ]

            emit("retrieved_context", {
                "sources": sources_summary,
                "chunks": retrieved,
                "count": len(sources_summary),
            })
            emit("agent_status", {
                "node": "docs",
                "name": "Docs RAG",
                "status": "done",
                "time": "done",
                "result": {"sources": sources_summary},
            })

            # ── 4. Fix Agent ─────────────────────────────────────────────────
            emit("agent_status", {
                "node": "fix",
                "name": "Fix Agent",
                "status": "running",
                "time": "planning...",
            })
            from app.agents.fix_agent import generate_fix
            fix_plan_data = generate_fix(
                issue_summary=issue_summary,
                affected_files=affected_files,
                call_graph=call_graph,
                file_contents=file_contents,
                retrieved_context=retrieved,
            )

            if isinstance(fix_plan_data, dict) and "error" in fix_plan_data:
                emit("agent_status", {"node": "fix", "name": "Fix Agent", "status": "error"})
                emit("error", {"error": fix_plan_data["error"]})
                return

            emit("agent_status", {
                "node": "fix",
                "name": "Fix Agent",
                "status": "done",
                "time": "done",
                "result": fix_plan_data,
            })

            # ── 5. Final Complete ────────────────────────────────────────────
            emit("complete", {
                "message": "Fix plan generated",
                "issue_summary": issue_summary,
                "affected_files": affected_files,
                "call_graph": call_graph,
                "fix_plan": fix_plan_data,
                "retrieved_context": retrieved,
            })

        except Exception as e:
            logger.error("Error in streaming fix plan: %s", e, exc_info=True)
            emit("error", {"error": str(e)})
        finally:
            loop.call_soon_threadsafe(event_queue.put_nowait, None)

    # Launch pipeline in background thread
    asyncio.get_running_loop().run_in_executor(None, run_sync_pipeline)

    while True:
        item = await event_queue.get()
        if item is None:
            break
        event, data = item
        yield _format_sse(event, data)


@router.get("/fix-plan-stream")
async def fix_plan_stream_get(
    repo_url: str = Query(..., description="Target repository URL"),
    issue_url: str = Query(..., description="Target issue URL"),
    session_id: Optional[str] = Query(None, description="Optional session ID"),
):
    """Server-Sent Events (SSE) stream for real-time agent execution status and RAG progress."""
    sid = session_id or str(uuid.uuid4())
    return StreamingResponse(
        _stream_fix_plan(repo_url=repo_url, issue_url=issue_url, session_id=sid),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/fix-plan-stream")
async def fix_plan_stream_post(request: FixPlanRequest):
    """POST variant of the Server-Sent Events stream."""
    sid = request.session_id or str(uuid.uuid4())
    return StreamingResponse(
        _stream_fix_plan(repo_url=request.repo_url, issue_url=request.issue_url, session_id=sid),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
