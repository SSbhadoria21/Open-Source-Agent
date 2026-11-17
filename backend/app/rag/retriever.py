"""
High-level retriever module.
Coordinates loader, chunker, embedder, and store to fulfill documentation queries.
"""
import logging
from typing import List, Dict, Any, Optional, Callable
from app.services.github import github_client
from app.core.config import settings
from app.rag.loader import load_repo_documents
from app.rag.chunker import chunk_documents
from app.rag.embedder import embedder, GeminiEmbedder
from app.rag.store import store, ChromaStore
from app.rag.models import RetrievalResult

logger = logging.getLogger(__name__)


def ensure_repo_indexed(
    repo_url: str,
    force_refresh: bool = False,
    on_progress: Optional[Callable[[str, str, int, int], None]] = None,
    store_instance: Optional[ChromaStore] = None,
) -> bool:
    """
    Ensure the target repository is loaded and indexed into the vector store.
    
    Returns:
        True if the repo is now indexed and fresh, False on failure.
    """
    s = store_instance or store
    repo_name = github_client._parse_repo_name(repo_url)

    if not force_refresh and s.is_collection_fresh(repo_name):
        logger.info("ensure_repo_indexed: %s is already indexed and fresh", repo_name)
        if on_progress:
            on_progress("indexing_docs", f"Documentation index for {repo_name} is fresh.", 1, 1)
        return True

    try:
        if on_progress:
            on_progress("indexing_docs", f"Fetching documentation files for {repo_name}...", 0, 100)

        docs = load_repo_documents(repo_url, on_progress=on_progress)
        if not docs:
            logger.warning("ensure_repo_indexed: No documents retrieved for %s", repo_name)

        if on_progress:
            on_progress("indexing_docs", f"Chunking {len(docs)} documents...", len(docs), len(docs))

        max_chunks = getattr(settings, "RAG_MAX_CHUNKS", 200)
        chunks = chunk_documents(docs, repo_name=repo_name, max_total_chunks=max_chunks)

        if on_progress:
            on_progress("indexing_docs", f"Generating embeddings for {len(chunks)} chunks...", 0, len(chunks))

        status = s.index_chunks(repo_name=repo_name, chunks=chunks, force_refresh=force_refresh)

        if on_progress:
            on_progress("indexing_docs", f"Successfully indexed {status.total_chunks} chunks.", status.total_chunks, status.total_chunks)

        return True
    except Exception as e:
        logger.error("ensure_repo_indexed failed for %s: %s", repo_name, e, exc_info=True)
        return False


def retrieve(
    query: str,
    repo: str,
    k: Optional[int] = None,
    min_score: Optional[float] = None,
    force_refresh: bool = False,
    on_progress: Optional[Callable[[str, str, int, int], None]] = None,
    store_instance: Optional[ChromaStore] = None,
    embedder_instance: Optional[GeminiEmbedder] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve documentation chunks relevant to a user query for a target repository.

    Args:
        query: Search query (e.g. issue title, requirements, keywords).
        repo: Repository URL or 'owner/repo'.
        k: Maximum number of chunks to return (defaults to settings.RAG_TOP_K or 5).
        min_score: Minimum similarity score threshold (defaults to settings.RAG_MIN_SCORE or 0.5).
        force_refresh: If True, re-fetches and re-indexes repository docs.
        on_progress: Optional callback fn(stage, message, current, total).

    Returns:
        List of dicts: [{text, file_path, heading, source_url, score}, ...]
        Filtered to results with score >= min_score.
    """
    if not query or not query.strip():
        logger.warning("retrieve called with empty query")
        return []

    repo_name = github_client._parse_repo_name(repo)
    top_k = k if k is not None else getattr(settings, "RAG_TOP_K", 5)
    score_threshold = (
        min_score if min_score is not None else getattr(settings, "RAG_MIN_SCORE", 0.5)
    )

    s = store_instance or store
    emb = embedder_instance or embedder

    try:
        # Step 1: Ensure repository is indexed
        ensure_repo_indexed(
            repo_url=repo,
            force_refresh=force_refresh,
            on_progress=on_progress,
            store_instance=s,
        )

        # Step 2: Embed query
        query_vector = emb.embed_query(query)

        # Step 3: Query store
        raw_results = s.query(repo_name=repo_name, query_embedding=query_vector, k=top_k * 2)

        # Step 4: Filter by minimum score and format
        filtered_results: List[Dict[str, Any]] = []
        for item in raw_results:
            score = item.get("score", 0.0)
            if score >= score_threshold:
                filtered_results.append({
                    "text": item.get("text", ""),
                    "file_path": item.get("file_path", ""),
                    "heading": item.get("heading", ""),
                    "source_url": item.get("source_url", ""),
                    "score": score,
                })

            if len(filtered_results) >= top_k:
                break

        # Fallback: if min_score filtered everything out, keep the highest-scoring single result
        # if it has a non-trivial score (> 0.25) so the model has at least some context
        if not filtered_results and raw_results:
            best = raw_results[0]
            if best.get("score", 0.0) >= 0.25:
                filtered_results.append({
                    "text": best.get("text", ""),
                    "file_path": best.get("file_path", ""),
                    "heading": best.get("heading", ""),
                    "source_url": best.get("source_url", ""),
                    "score": best.get("score", 0.0),
                })

        logger.info(
            "retrieve: query='%s' repo='%s' -> returned %d chunks (threshold=%.2f)",
            query[:60],
            repo_name,
            len(filtered_results),
            score_threshold,
        )
        return filtered_results

    except Exception as e:
        logger.warning(
            "retrieve encountered an error for repo %s: %s (falling back to empty context)",
            repo_name,
            e,
            exc_info=True,
        )
        return []
