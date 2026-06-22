from typing import TypedDict, Any, Dict, List
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
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

# Placeholder Agent Nodes
def repo_agent_node(state: AgentState) -> AgentState:
    print(f"Running Repo Agent for {state['payload'].get('repo_url')}")
    state["repo_summary"] = {"status": "analyzed"}
    return state

def issue_agent_node(state: AgentState) -> AgentState:
    print(f"Running Issue Agent for {state['payload'].get('issue_url')}")
    state["issue_summary"] = {"status": "explained"}
    return state

def code_agent_node(state: AgentState) -> AgentState:
    print(f"Running Code Agent")
    state["affected_files"] = []
    return state

def fix_agent_node(state: AgentState) -> AgentState:
    print(f"Running Fix Agent")
    state["fix_plan"] = {"status": "generated"}
    return state

def review_agent_node(state: AgentState) -> AgentState:
    state["pr_review"] = {"status": "reviewed"}
    return state

def triage_agent_node(state: AgentState) -> AgentState:
    state["triage_result"] = {"status": "triaged"}
    return state

def duplicate_agent_node(state: AgentState) -> AgentState:
    state["duplicate_result"] = {"status": "checked"}
    return state

def label_agent_node(state: AgentState) -> AgentState:
    state["label_result"] = {"status": "labeled"}
    return state

def match_agent_node(state: AgentState) -> AgentState:
    state["match_result"] = {"status": "matched"}
    return state

def health_agent_node(state: AgentState) -> AgentState:
    state["health_report"] = {"status": "generated"}
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
    
    # Define entry point router
    workflow.set_conditional_entry_point(
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
            END: END
        }
    )
    
    # Define edges from simple nodes to END
    for node in ["repo_agent", "fix_agent", "review_agent", "triage_agent", 
                 "duplicate_agent", "label_agent", "match_agent", "health_agent"]:
        workflow.add_edge(node, END)
        
    # Define conditional edges for multi-step flows
    workflow.add_conditional_edges("issue_agent", after_issue_agent, {
        "code_agent": "code_agent",
        END: END
    })
    
    workflow.add_conditional_edges("code_agent", after_code_agent, {
        "fix_agent": "fix_agent",
        END: END
    })
    
    return workflow.compile()

# Instantiate the global graph
orchestrator = build_orchestrator_graph()
