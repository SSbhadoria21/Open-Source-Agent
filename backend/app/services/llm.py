"""
LLM service with built-in exponential backoff for rate-limit errors.

Free-tier limits for gemini-1.5-flash:
  - 15 requests per minute (RPM)
  - 1,000,000 tokens per day (TPD)
  - 1,500 requests per day (RPD)

gemini-2.0-flash has limit=0 on the free tier — do NOT use it.

All agent `chain.invoke(...)` calls automatically benefit from the retry
logic because it is baked into _LazyLLM.invoke().
"""
import time
import random
import logging
from typing import List, Any

from langchain_core.runnables import Runnable
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

# Keywords that indicate a retryable rate-limit error
_RATE_LIMIT_SIGNALS = (
    "429",
    "resource_exhausted",
    "quota",
    "rate limit",
    "too many requests",
    "503",
    "service unavailable",
    "retry",
)


def _is_rate_limit_error(exc: Exception) -> bool:
    return any(kw in str(exc).lower() for kw in _RATE_LIMIT_SIGNALS)


def _backoff_delay(attempt: int, base: float) -> float:
    """Exponential backoff with ±25% jitter. attempt is 0-indexed."""
    delay = base * (2 ** attempt)
    jitter = delay * 0.25 * (random.random() * 2 - 1)   # ±25%
    return max(1.0, delay + jitter)


# ─── Lazy LLM wrapper ─────────────────────────────────────────────────────────

class _LazyLLM(Runnable):
    """Lazy-init LLM with built-in exponential backoff for rate-limit errors.

    Allows the server to start cleanly without any API key configured.
    On 429/quota errors, retries up to settings.RATE_LIMIT_MAX_RETRIES times
    with exponential backoff before raising.
    """

    def __init__(self, model_attr: str, temperature: float = 0.2, max_output_tokens: int = 2048):
        super().__init__()
        self._model_attr = model_attr
        self._temperature = temperature
        self._max_output_tokens = max_output_tokens
        self._instance = None

    def _get_instance(self) -> ChatGoogleGenerativeAI:
        if self._instance is None:
            api_key = settings.GEMINI_API_KEY
            if not api_key or api_key.startswith("your_"):
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. "
                    "Set it in backend/.env to enable AI features."
                )
            model_name = getattr(settings, self._model_attr)
            self._instance = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=self._temperature,
                max_output_tokens=self._max_output_tokens,
            )
        return self._instance

    def invoke(self, input: Any, config=None, **kwargs) -> Any:
        """Invoke with exponential backoff on rate-limit errors (429 / quota)."""
        max_retries = settings.RATE_LIMIT_MAX_RETRIES
        base_delay = settings.RATE_LIMIT_BASE_DELAY

        for attempt in range(max_retries + 1):
            try:
                res = self._get_instance().invoke(input, config=config, **kwargs)
                # Post-process to ensure res.content is always a string (TRD compat with new google-genai)
                if hasattr(res, "content"):
                    if isinstance(res.content, list):
                        parts = []
                        for part in res.content:
                            if isinstance(part, str):
                                parts.append(part)
                            elif isinstance(part, dict) and "text" in part:
                                parts.append(part["text"])
                            elif hasattr(part, "text"):
                                parts.append(part.text)
                            elif hasattr(part, "get") and part.get("text"):
                                parts.append(part.get("text"))
                        res.content = "".join(parts)
                    elif not isinstance(res.content, str):
                        res.content = str(res.content)
                return res
            except Exception as exc:
                is_last = attempt == max_retries
                if _is_rate_limit_error(exc) and not is_last:
                    delay = _backoff_delay(attempt, base_delay)
                    logger.warning(
                        "Rate limit hit on attempt %d/%d for model %s. "
                        "Waiting %.1fs before retry. Error: %s",
                        attempt + 1, max_retries + 1,
                        getattr(settings, self._model_attr),
                        delay,
                        exc,
                    )
                    time.sleep(delay)
                else:
                    raise

    def __getattr__(self, name: str) -> Any:
        return getattr(self._get_instance(), name)


# ─── Lazy Embeddings wrapper ──────────────────────────────────────────────────

class _LazyEmbeddings:
    """Lazy-init embeddings with exponential backoff for rate-limit errors."""

    def __init__(self):
        self._instance = None

    def _get_instance(self) -> GoogleGenerativeAIEmbeddings:
        if self._instance is None:
            api_key = settings.GEMINI_API_KEY
            if not api_key or api_key.startswith("your_"):
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. "
                    "Set it in backend/.env to enable embedding functionality."
                )
            self._instance = GoogleGenerativeAIEmbeddings(
                model=settings.EMBEDDING_MODEL,
                google_api_key=api_key,
            )
        return self._instance

    def _call_with_backoff(self, fn, *args, **kwargs):
        """Call fn with exponential backoff on rate-limit errors."""
        max_retries = settings.RATE_LIMIT_MAX_RETRIES
        base_delay = settings.RATE_LIMIT_BASE_DELAY

        for attempt in range(max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as exc:
                is_last = attempt == max_retries
                if _is_rate_limit_error(exc) and not is_last:
                    delay = _backoff_delay(attempt, base_delay)
                    logger.warning(
                        "Embedding rate limit hit (attempt %d/%d). "
                        "Waiting %.1fs. Error: %s",
                        attempt + 1, max_retries + 1, delay, exc,
                    )
                    time.sleep(delay)
                else:
                    raise

    def embed_query(self, text: str) -> List[float]:
        inst = self._get_instance()
        return self._call_with_backoff(inst.embed_query, text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        inst = self._get_instance()
        return self._call_with_backoff(inst.embed_documents, texts)


# ─── Singletons — lazy, no API key required at import time ───────────────────

llm = _LazyLLM("LLM_MODEL")               # gemini-1.5-flash by default
fast_llm = _LazyLLM("LLM_MODEL", temperature=0.1)
embedding_llm = _LazyEmbeddings()          # text-embedding-004
