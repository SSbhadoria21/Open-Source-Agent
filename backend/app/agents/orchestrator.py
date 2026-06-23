from typing import TypedDict, Any, Dict, List, Optional
from langgraph.graph import StateGraph, END, START


class AgentState(TypedDict, total=False):
    user_role: str
    intent: str
    payload: Dict[str, Any]
    session_id: str

    # Optional outputs
    repo_summary: Dict[str, Any]
    issue_summary: Dict[str, Any]
    affected_files: List[Dict[str, Any]]
    call_graph: Dict[str, Any]
    fix_plan: Dict[str, Any]
    pr_review: Dict[str, Any]
    triage_result: Dict[str, Any]
    duplicate_result: Dict[str, Any]
    label_result: Dict[str, Any]
    match_result: Dict[str, Any]
    health_report: Dict[str, Any]


def orchestrator_router(state: AgentState) -> str:
    """Route to appropriate sub-agent based on intent."""
    intent = state.get("intent")

    # Map intents to nodes
    routes = {
        "analyze_repo": "repo_agent",
        "explain_issue": "issue_agent",
        "trace_code": "issue_agent",
        "generate_fix": "issue_agent",
        "review_pr": "review_agent",
        "triage_issue": "triage_agent",
        "detect_duplicate": "duplicate_agent",
        "label_issue": "label_agent",
        "match_contributor": "match_agent",
        "project_health": "health_agent",
    }

    return routes.get(intent, END)


from app.agents.repo_agent import analyze_repository
from app.agents.issue_agent import explain_issue
from app.agents.code_agent import trace_code
from app.agents.fix_agent import generate_fix
from app.agents.review_agent import review_pr
from app.agents.triage_agent import triage_issue
from app.agents.duplicate_agent import detect_duplicate
from app.agents.label_agent import label_issue
from app.agents.match_agent import match_contributor
from app.agents.health_agent import project_health


def repo_agent_node(state: AgentState) -> AgentState:
    repo_url = state["payload"].get("repo_url")
    state["repo_summary"] = analyze_repository(repo_url)
    return state


def issue_agent_node(state: AgentState) -> AgentState:
    issue_url = state["payload"].get("issue_url")
    state["issue_summary"] = explain_issue(issue_url)
    return state


def code_agent_node(state: AgentState) -> AgentState:
    repo_url = state["payload"].get("repo_url")
    issue_summary = state.get("issue_summary", {})
    code_result = trace_code(repo_url, issue_summary)
    state["affected_files"] = code_result.get("affected_files", [])
    state["call_graph"] = code_result.get("call_graph", {})
    return state


def fix_agent_node(state: AgentState) -> AgentState:
    issue_summary = state.get("issue_summary", {})
    affected_files = state.get("affected_files", [])
    call_graph = state.get("call_graph", {})
    state["fix_plan"] = generate_fix(issue_summary, affected_files, call_graph)
    return state


def review_agent_node(state: AgentState) -> AgentState:
    pr_url = state["payload"].get("pr_url")
    state["pr_review"] = review_pr(pr_url)
    return state


def triage_agent_node(state: AgentState) -> AgentState:
    issue_url = state["payload"].get("issue_url")
    state["triage_result"] = triage_issue(issue_url)
    return state


def duplicate_agent_node(state: AgentState) -> AgentState:
    issue_url = state["payload"].get("issue_url")
    repo_url = state["payload"].get("repo_url")
    state["duplicate_result"] = detect_duplicate(issue_url, repo_url)
    return state


def label_agent_node(state: AgentState) -> AgentState:
    repo_url = state["payload"].get("repo_url")
    issue_summary = state.get("issue_summary", {})
    state["label_result"] = label_issue(repo_url, issue_summary)
    return state


def match_agent_node(state: AgentState) -> AgentState:
    issue_url = state["payload"].get("issue_url")
    state["match_result"] = match_contributor(issue_url)
    return state


def health_agent_node(state: AgentState) -> AgentState:
    repo_url = state["payload"].get("repo_url")
    state["health_report"] = project_health(repo_url)
    return state


# Intermediate routing for complex flows
def after_issue_agent(state: AgentState) -> str:
    intent = state.get("intent")
    if intent in ["trace_code", "generate_fix"]:
        return "code_agent"
    return END


def after_code_agent(state: AgentState) -> str:
    intent = state.get("intent")
    if intent == "generate_fix":
        return "fix_agent"
    return END


def build_orchestrator_graph():
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("repo_agent", repo_agent_node)
    workflow.add_node("issue_agent", issue_agent_node)
    workflow.add_node("code_agent", code_agent_node)
    workflow.add_node("fix_agent", fix_agent_node)
    workflow.add_node("review_agent", review_agent_node)
    workflow.add_node("triage_agent", triage_agent_node)
    workflow.add_node("duplicate_agent", duplicate_agent_node)
    workflow.add_node("label_agent", label_agent_node)
    workflow.add_node("match_agent", match_agent_node)
    workflow.add_node("health_agent", health_agent_node)

    # Use the current LangGraph API: conditional edges from START
    workflow.add_conditional_edges(
        START,
        orchestrator_router,
        {
            "repo_agent": "repo_agent",
            "issue_agent": "issue_agent",
            "review_agent": "review_agent",
            "triage_agent": "triage_agent",
            "duplicate_agent": "duplicate_agent",
            "label_agent": "label_agent",
            "match_agent": "match_agent",
            "health_agent": "health_agent",
            END: END,
        },
    )

    # Define edges from simple nodes to END
    for node in [
        "repo_agent", "fix_agent", "review_agent", "triage_agent",
        "duplicate_agent", "label_agent", "match_agent", "health_agent",
    ]:
        workflow.add_edge(node, END)

    # Define conditional edges for multi-step flows
    workflow.add_conditional_edges("issue_agent", after_issue_agent, {
        "code_agent": "code_agent",
        END: END,
    })

    workflow.add_conditional_edges("code_agent", after_code_agent, {
        "fix_agent": "fix_agent",
        END: END,
    })

    return workflow.compile()


# Instantiate the global graph
orchestrator = build_orchestrator_graph()
