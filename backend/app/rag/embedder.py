"""
Gemini Embedder module using the official google-genai SDK.
Handles batching, rate-limit backoff, and distinct task types:
- RETRIEVAL_DOCUMENT for document chunks
- RETRIEVAL_QUERY for search queries
"""
import time
import random
import logging
import re
from typing import List, Optional
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)

# Signals indicating temporary rate limits or quota throttling
_RATE_LIMIT_SIGNALS = (
    "429",
    "resource_exhausted",
    "quota",
    "rate limit",
    "too many requests",
    "503",
    "service unavailable",
)


def _is_rate_limit(exc: Exception) -> bool:
    return any(sig in str(exc).lower() for sig in _RATE_LIMIT_SIGNALS)


def _extract_retry_delay(exc: Exception) -> Optional[float]:
    msg = str(exc)
    # Check for retry in Xs or retryDelay
    m = re.search(r"retry in (\d+(?:\.\d+)?)s", msg, re.IGNORECASE)
    if m:
        return float(m.group(1)) + 1.0
    m2 = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+)s", msg, re.IGNORECASE)
    if m2:
        return float(m2.group(1)) + 1.0
    return None


def _backoff_sleep(attempt: int, base: float = 4.0, exc: Optional[Exception] = None) -> None:
    suggested = _extract_retry_delay(exc) if exc else None
    if suggested and suggested > 0:
        actual_delay = suggested
        logger.warning("Embedding rate limit encountered. Backing off for %.2fs as instructed by API...", actual_delay)
    else:
        delay = base * (2**attempt)
        jitter = delay * 0.25 * (random.random() * 2 - 1)
        actual_delay = max(2.0, delay + jitter)
        logger.warning("Embedding rate limit encountered. Backing off for %.2fs...", actual_delay)
    time.sleep(actual_delay)


class GeminiEmbedder:
    """Wrapper around google-genai SDK for generating document and query embeddings."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        batch_size: int = 50,
        max_retries: int = 6,
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or getattr(settings, "EMBEDDING_MODEL", "gemini-embedding-001")
        self.batch_size = batch_size
        self.max_retries = max_retries
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        if self._client is None:
            if not self.api_key or self.api_key.startswith("your_"):
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. "
                    "Set it in backend/.env to enable embedding functionality."
                )
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of text chunks with task_type='RETRIEVAL_DOCUMENT'.
        Processes chunks in batches to respect payload limits.
        """
        if not texts:
            return []

        client = self._get_client()
        config = types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]

            for attempt in range(self.max_retries + 1):
                try:
                    response = client.models.embed_content(
                        model=self.model,
                        contents=batch,
                        config=config,
                    )
                    batch_vectors = [emb.values for emb in response.embeddings]
                    all_embeddings.extend(batch_vectors)
                    time.sleep(0.5)
                    break
                except Exception as exc:
                    if _is_rate_limit(exc) and attempt < self.max_retries:
                        _backoff_sleep(attempt, exc=exc)
                    else:
                        logger.error(
                            "Failed to embed batch %d-%d (attempt %d): %s",
                            i,
                            i + len(batch),
                            attempt + 1,
                            exc,
                        )
                        raise exc

        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single search query with task_type='RETRIEVAL_QUERY'.
        """
        if not query or not query.strip():
            raise ValueError("Query string cannot be empty")

        client = self._get_client()
        config = types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")

        for attempt in range(self.max_retries + 1):
            try:
                response = client.models.embed_content(
                    model=self.model,
                    contents=query,
                    config=config,
                )
                if response.embeddings and len(response.embeddings) > 0:
                    return response.embeddings[0].values
                raise RuntimeError("No embedding vector returned by Gemini API")
            except Exception as exc:
                if _is_rate_limit(exc) and attempt < self.max_retries:
                    _backoff_sleep(attempt, exc=exc)
                else:
                    logger.error("Failed to embed query '%s': %s", query[:50], exc)
                    raise exc


# Singleton embedder instance for shared use
embedder = GeminiEmbedder()
