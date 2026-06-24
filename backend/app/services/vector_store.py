"""
Vector store service backed by Chroma (embedded/persistent mode).

Uses PersistentClient so embeddings survive server restarts.
Lazy-initialized — server starts without Chroma configured.
"""
from typing import List, Dict, Any, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Thin wrapper around Chroma for the 'issues' collection."""

    def __init__(self):
        self._client = None
        self._collection = None

    def _ensure_client(self):
        if self._client is not None:
            return
        try:
            import chromadb  # type: ignore
            self._client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
            self._collection = self._client.get_or_create_collection(
                name="issues",
                metadata={"hnsw:space": "cosine"},  # use cosine distance
            )
            logger.info("Chroma initialized at path=%s", settings.CHROMA_PATH)
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Chroma vector store: {e}") from e

    # ─── Write ────────────────────────────────────────────────────────────────

    def upsert_issue(
        self,
        issue_id: str,
        embedding: List[float],
        text: str,
        metadata: Dict[str, Any],
    ) -> None:
        """Insert or update an issue embedding.

        issue_id format: "{repo_full_name}:{issue_number}"
        metadata keys: repo, issue_number, state (per TRD §4.2)
        """
        self._ensure_client()
        self._collection.upsert(
            ids=[issue_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[metadata],
        )

    # ─── Read ─────────────────────────────────────────────────────────────────

    def query_similar(
        self,
        embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Query nearest neighbours.

        Returns list of dicts with keys: id, similarity, document, metadata.
        Chroma cosine distance ∈ [0, 2]; similarity = 1 - distance.
        """
        self._ensure_client()
        if self._collection.count() == 0:
            return []

        kwargs: Dict[str, Any] = {
            "query_embeddings": [embedding],
            "n_results": min(n_results, self._collection.count()),
        }
        if where:
            kwargs["where"] = where

        results = self._collection.query(**kwargs)

        items = []
        if results and results.get("ids"):
            for i, doc_id in enumerate(results["ids"][0]):
                distance = (results.get("distances") or [[]])[0][i] if results.get("distances") else 0.0
                # Cosine space: distance=0 means identical, distance=2 means opposite
                similarity = max(0.0, 1.0 - distance)
                items.append({
                    "id": doc_id,
                    "similarity": similarity,
                    "document": (results.get("documents") or [[]])[0][i],
                    "metadata": (results.get("metadatas") or [[]])[0][i] or {},
                })
        return items

    def collection_count(self) -> int:
        """Return number of documents in the issues collection."""
        try:
            self._ensure_client()
            return self._collection.count()
        except Exception:
            return 0


vector_store = VectorStoreService()
