"""
ChromaDB vector store module for RAG collections.
Maintains persistent collections per repository with 24-hour freshness caching.
"""
import re
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import chromadb
from app.core.config import settings
from app.rag.models import Chunk, IndexStatus
from app.rag.embedder import embedder, GeminiEmbedder

logger = logging.getLogger(__name__)


def derive_collection_name(repo_name: str) -> str:
    """
    Derive a valid Chroma collection name from an owner/repo string.
    Chroma requirements: 3-63 chars, [a-zA-Z0-9_-], starts and ends with alphanumeric.
    """
    clean = re.sub(r"[^a-zA-Z0-9_]", "_", repo_name.lower().replace("/", "_"))
    name = f"repo_{clean}"[:63].rstrip("_")
    if len(name) < 3:
        name = f"{name}_rag"[:63]
    return name


class ChromaStore:
    """
    Persistent ChromaDB manager for repository documentation collections.
    """

    def __init__(
        self,
        chroma_dir: Optional[str] = None,
        cache_hours: Optional[int] = None,
        embedder_instance: Optional[GeminiEmbedder] = None,
    ):
        self.chroma_dir = (
            chroma_dir
            or getattr(settings, "CHROMA_DIR", None)
            or getattr(settings, "CHROMA_PATH", ".chroma_rag")
        )
        self.cache_hours = (
            cache_hours
            if cache_hours is not None
            else getattr(settings, "RAG_CACHE_HOURS", 24)
        )
        self.embedder = embedder_instance or embedder
        self._client: Optional[chromadb.PersistentClient] = None

    def _ensure_client(self) -> chromadb.PersistentClient:
        if self._client is None:
            os.makedirs(self.chroma_dir, exist_ok=True)
            self._client = chromadb.PersistentClient(path=self.chroma_dir)
            logger.info("ChromaStore initialized at %s", self.chroma_dir)
        return self._client

    def is_collection_fresh(self, repo_name: str) -> bool:
        """
        Check if a repository collection exists, has documents, and was indexed within cache_hours.
        """
        client = self._ensure_client()
        col_name = derive_collection_name(repo_name)

        try:
            col = client.get_collection(col_name)
            if col.count() == 0:
                return False

            metadata = col.metadata or {}
            indexed_at_str = metadata.get("indexed_at")
            if not indexed_at_str:
                return False

            indexed_at = datetime.fromisoformat(indexed_at_str)
            if indexed_at.tzinfo is None:
                indexed_at = indexed_at.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            max_age = timedelta(hours=self.cache_hours)
            return (now - indexed_at) <= max_age
        except Exception:
            return False

    def index_chunks(
        self,
        repo_name: str,
        chunks: List[Chunk],
        force_refresh: bool = False,
    ) -> IndexStatus:
        """
        Index chunks into the repository collection.
        Skips embedding and writes if existing collection is fresh and force_refresh is False.
        """
        client = self._ensure_client()
        col_name = derive_collection_name(repo_name)
        now_str = datetime.now(timezone.utc).isoformat()

        # Check freshness
        if not force_refresh and self.is_collection_fresh(repo_name):
            col = client.get_collection(col_name)
            metadata = col.metadata or {}
            cached_at = metadata.get("indexed_at", now_str)
            logger.info("Collection for %s is fresh. Skipping re-indexing.", repo_name)
            return IndexStatus(
                repo=repo_name,
                collection_name=col_name,
                total_chunks=col.count(),
                indexed_at=cached_at,
                was_cached=True,
            )

        # Clear existing collection if refreshing
        try:
            client.delete_collection(col_name)
            logger.info("Deleted existing collection %s for re-indexing", col_name)
        except Exception:
            pass

        if not chunks:
            logger.warning("No chunks provided to index for %s", repo_name)
            col = client.get_or_create_collection(
                name=col_name,
                metadata={"hnsw:space": "cosine", "indexed_at": now_str, "repo": repo_name},
            )
            return IndexStatus(
                repo=repo_name,
                collection_name=col_name,
                total_chunks=0,
                indexed_at=now_str,
                was_cached=False,
            )

        # Create fresh collection
        col = client.create_collection(
            name=col_name,
            metadata={"hnsw:space": "cosine", "indexed_at": now_str, "repo": repo_name},
        )

        texts = [c.text for c in chunks]
        logger.info("Embedding %d chunks for %s using Gemini...", len(texts), repo_name)
        embeddings = self.embedder.embed_documents(texts)

        ids = [c.id for c in chunks]
        metadatas = [
            {
                "repo": c.repo,
                "file_path": c.file_path,
                "heading": c.heading,
                "source_url": c.source_url,
                "chunk_index": c.chunk_index,
            }
            for c in chunks
        ]

        # Add to Chroma collection
        col.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )

        logger.info("Indexed %d chunks into %s", len(chunks), col_name)
        return IndexStatus(
            repo=repo_name,
            collection_name=col_name,
            total_chunks=len(chunks),
            indexed_at=now_str,
            was_cached=False,
        )

    def query(
        self,
        repo_name: str,
        query_embedding: List[float],
        k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Query the repository collection for nearest document chunks.
        Computes cosine similarity = max(0.0, 1.0 - distance).
        """
        client = self._ensure_client()
        col_name = derive_collection_name(repo_name)

        try:
            col = client.get_collection(col_name)
        except Exception as e:
            logger.warning("No collection found for %s: %s", repo_name, e)
            return []

        total_docs = col.count()
        if total_docs == 0:
            return []

        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(k, total_docs),
        )

        items: List[Dict[str, Any]] = []
        if not results or not results.get("ids") or not results["ids"][0]:
            return items

        doc_ids = results["ids"][0]
        distances = results.get("distances", [[]])[0] if results.get("distances") else []
        documents = results.get("documents", [[]])[0] if results.get("documents") else []
        metadatas = results.get("metadatas", [[]])[0] if results.get("metadatas") else []

        for i in range(len(doc_ids)):
            distance = distances[i] if i < len(distances) else 0.0
            similarity = max(0.0, 1.0 - distance)
            meta = metadatas[i] if i < len(metadatas) else {}

            items.append({
                "id": doc_ids[i],
                "text": documents[i] if i < len(documents) else "",
                "score": round(similarity, 4),
                "file_path": meta.get("file_path", "unknown"),
                "heading": meta.get("heading", ""),
                "source_url": meta.get("source_url", ""),
                "repo": meta.get("repo", repo_name),
            })

        return items


# Singleton store instance
store = ChromaStore()
