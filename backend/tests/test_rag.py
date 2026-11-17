"""
Unit tests for the RAG pipeline: chunker, store, and retriever.
"""
import os
import tempfile
import pytest
from unittest.mock import MagicMock

from app.rag.models import DocFile, Chunk
from app.rag.chunker import (
    _split_into_heading_sections,
    _split_text_by_size,
    chunk_document,
    chunk_documents,
)
from app.rag.store import ChromaStore, derive_collection_name
from app.rag.retriever import retrieve


def test_heading_split():
    md = (
        "Preamble text here.\n\n"
        "# Getting Started\n"
        "Here is how to get started.\n\n"
        "## Installation\n"
        "Run npm install.\n\n"
        "### Advanced Setup\n"
        "Extra configurations."
    )
    sections = _split_into_heading_sections(md, default_heading="Intro")
    assert len(sections) == 4
    assert sections[0][0] == "Intro"
    assert "Preamble" in sections[0][1]
    assert sections[1][0] == "Getting Started"
    assert sections[2][0] == "Installation"
    assert sections[3][0] == "Advanced Setup"


def test_chunk_size_split():
    long_text = "Word " * 300  # 1500 chars
    pieces = _split_text_by_size(long_text, max_size=400, overlap=50)
    assert len(pieces) > 1
    for piece in pieces:
        assert len(piece) <= 450


def test_chunk_document_metadata():
    doc = DocFile(
        file_path="CONTRIBUTING.md",
        content=(
            "# Contributing Guide\n\n"
            "Thank you for contributing!\n\n"
            "## Development Workflow\n"
            "Fork the repo and create a branch.\n\n"
            "## Running Tests\n"
            "Execute pytest in the terminal."
        ),
        source_url="https://github.com/org/repo/blob/main/CONTRIBUTING.md",
    )

    chunks = chunk_document(doc, repo_name="org/repo", max_chunk_size=800)
    assert len(chunks) == 3
    assert chunks[0].heading == "Contributing Guide"
    assert chunks[0].repo == "org/repo"
    assert chunks[0].file_path == "CONTRIBUTING.md"
    assert chunks[0].source_url == doc.source_url
    assert chunks[1].heading == "Development Workflow"
    assert chunks[2].heading == "Running Tests"


def test_chunk_documents_cap():
    docs = [
        DocFile(
            file_path=f"docs/file_{i}.md",
            content=f"# Doc {i}\n" + ("Sample content line.\n" * 50),
            source_url=f"https://github.com/org/repo/blob/main/docs/file_{i}.md",
        )
        for i in range(10)
    ]
    chunks = chunk_documents(docs, repo_name="org/repo", max_total_chunks=8)
    assert len(chunks) == 8


def test_derive_collection_name():
    assert derive_collection_name("facebook/react") == "repo_facebook_react"
    assert derive_collection_name("vercel/next.js") == "repo_vercel_next_js"
    assert len(derive_collection_name("some-user/some-very-long-repo-name-that-exceeds-sixty-three-characters-limit")) <= 63


def test_retriever_with_store():
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp_dir:
        mock_embedder = MagicMock()
        mock_embedder.embed_documents.return_value = [
            [0.1, 0.2, 0.3, 0.4],
            [0.4, 0.3, 0.2, 0.1],
        ]
        mock_embedder.embed_query.return_value = [0.1, 0.2, 0.3, 0.4]

        store = ChromaStore(chroma_dir=tmp_dir, embedder_instance=mock_embedder)

        chunks = [
            Chunk(
                id="c1",
                text="To run unit tests: run `pytest` in terminal.",
                repo="test/repo",
                file_path="CONTRIBUTING.md",
                heading="Running Tests",
                source_url="https://github.com/test/repo/blob/main/CONTRIBUTING.md",
                chunk_index=0,
            ),
            Chunk(
                id="c2",
                text="PR titles must follow Conventional Commits.",
                repo="test/repo",
                file_path=".github/PULL_REQUEST_TEMPLATE.md",
                heading="PR Format",
                source_url="https://github.com/test/repo/blob/main/.github/PULL_REQUEST_TEMPLATE.md",
                chunk_index=1,
            ),
        ]

        # Index chunks
        status = store.index_chunks("test/repo", chunks)
        assert status.total_chunks == 2
        assert status.was_cached is False

        # Query chunks
        results = store.query("test/repo", [0.1, 0.2, 0.3, 0.4], k=2)
        assert len(results) == 2
        assert results[0]["file_path"] in ["CONTRIBUTING.md", ".github/PULL_REQUEST_TEMPLATE.md"]
        assert results[0]["score"] >= 0.0


def test_retriever_error_fallback():
    # If anything unexpected occurs, retrieve returns [] without crashing
    bad_store = MagicMock()
    bad_store.is_collection_fresh.side_effect = RuntimeError("Disk full")

    results = retrieve(
        query="how to test",
        repo="test/broken_repo",
        store_instance=bad_store,
    )
    assert results == []
