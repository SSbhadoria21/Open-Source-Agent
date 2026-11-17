"""
Fallback tests for RAG layer (Task 4):
Verifies graceful degradation when:
1. Gemini embedding fails / invalid key / quota exceeded
2. Target repo has no CONTRIBUTING.md
3. Target repo is private or returns 404
4. Full LangGraph graph execution when RAG retrieval fails
"""
import pytest
from unittest.mock import MagicMock, patch
from typing import Dict, Any

from app.rag.models import DocFile, Chunk
from app.rag.retriever import retrieve, ensure_repo_indexed
from app.rag.loader import load_repo_documents
from app.agents.orchestrator import retrieve_repo_context_node, build_orchestrator_graph
from app.agents.fix_agent import generate_fix


def test_fallback_when_embedder_fails():
    """
    When the embedder raises an exception (e.g. invalid key, 401, 429 quota),
    retrieve() must catch it, log a warning, and return [] without raising.
    """
    mock_bad_embedder = MagicMock()
    mock_bad_embedder.embed_query.side_effect = RuntimeError("Google API 401: Invalid API key")

    mock_store = MagicMock()
    mock_store.is_collection_fresh.return_value = True

    results = retrieve(
        query="How to run tests",
        repo="test/repo",
        store_instance=mock_store,
        embedder_instance=mock_bad_embedder,
    )

    assert results == []
    assert isinstance(results, list)


def test_fallback_repo_with_no_contributing():
    """
    When a repository lacks CONTRIBUTING.md (has only README or other docs),
    load_repo_documents() must still return available docs without error.
    """
    fake_tree = [
        {"path": "README.md", "type": "blob"},
        {"path": "src/main.py", "type": "blob"},
        {"path": ".github/PULL_REQUEST_TEMPLATE.md", "type": "blob"},
    ]

    with patch("app.services.github.github_client.get_repo_tree", return_value=fake_tree), \
         patch("app.services.github.github_client.get_file_content", return_value="# Hello World"), \
         patch("app.services.github.github_client._ensure_client") as mock_ensure:
        
        mock_repo = MagicMock()
        mock_repo.default_branch = "main"
        mock_repo.get_pulls.return_value = []
        mock_repo.get_issues.return_value = []
        mock_ensure.return_value.get_repo.return_value = mock_repo

        docs = load_repo_documents("https://github.com/example/no-contributing")

        assert len(docs) >= 1
        file_paths = [d.file_path for d in docs]
        assert "README.md" in file_paths
        assert ".github/PULL_REQUEST_TEMPLATE.md" in file_paths
        assert "CONTRIBUTING.md" not in file_paths


def test_fallback_private_or_404_repo():
    """
    When a repository is private or does not exist (404),
    load_repo_documents() and retrieve() must gracefully return [] or standard fallbacks without crashing.
    """
    with patch("app.services.github.github_client.get_repo_tree", side_effect=Exception("404 Not Found: Repository not found")), \
         patch("app.services.github.github_client.get_file_content", side_effect=Exception("404 Not Found")), \
         patch("app.services.github.github_client._ensure_client", side_effect=Exception("404 Not Found")):

        docs = load_repo_documents("https://github.com/private/nonexistent-repo-999")
        # Should not crash, returns empty list
        assert docs == []

        # Calling retrieve on this repo should not crash and return []
        results = retrieve(query="how to install", repo="https://github.com/private/nonexistent-repo-999")
        assert results == []


def test_langgraph_retrieve_repo_context_node_on_error():
    """
    Test that retrieve_repo_context_node sets state['retrieved_context'] = []
    when retrieve() raises or fails, allowing the LangGraph pipeline to continue.
    """
    state = {
        "user_role": "newcomer",
        "intent": "generate_fix",
        "payload": {"repo_url": "https://github.com/fail/repo"},
        "issue_summary": {"title": "Fix bug", "plain_summary": "Bug in parser"},
    }

    with patch("app.rag.retriever.retrieve", side_effect=RuntimeError("Vector DB connection refused")):
        new_state = retrieve_repo_context_node(state)
        assert "retrieved_context" in new_state
        assert new_state["retrieved_context"] == []


def test_fix_agent_sources_contract_when_rag_empty():
    """
    Verify that when retrieved_context is empty, generate_fix() still returns
    a valid fix plan structure where 'sources' is an empty list, not missing or None.
    """
    mock_response = MagicMock()
    mock_response.content = (
        '{"title": "Fix bug", "steps": [{"step_number": 1, "action": "Update code"}], "sources": []}'
    )

    with patch("app.agents.fix_agent.llm.invoke", return_value=mock_response):
        plan = generate_fix(
            issue_summary={"title": "Fix bug", "plain_summary": "Issue"},
            affected_files=[],
            call_graph={},
            file_contents={},
            retrieved_context=[],  # Empty RAG context
        )

        assert "sources" in plan
        assert isinstance(plan["sources"], list)
        assert len(plan["sources"]) == 0
