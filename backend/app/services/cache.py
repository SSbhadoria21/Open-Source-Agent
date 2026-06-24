"""
Redis caching service — TRD §9.3

Caches:
  - Repo file tree  (TTL: 15 min) — key: cache:repo_tree:{owner}/{repo}
  - Issue content   (TTL: 5  min) — key: cache:issue:{owner}/{repo}:{number}
  - Health report   (TTL: 1  hr)  — key: cache:health:{owner}/{repo}

Lazy-initialized — server starts without Redis configured (falls back to no-cache).
"""
import json
import logging
from typing import Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# TTLs in seconds
_REPO_TREE_TTL = 15 * 60      # 15 minutes
_ISSUE_TTL = 5 * 60           # 5 minutes
_HEALTH_TTL = 60 * 60         # 1 hour


class CacheService:
    def __init__(self):
        self._client = None
        self._disabled = False  # set True if Redis is unavailable

    def _ensure_client(self):
        if self._client is not None or self._disabled:
            return
        try:
            import redis  # type: ignore
            self._client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self._client.ping()
            logger.info("Redis cache initialized at %s", settings.REDIS_URL)
        except Exception as e:
            logger.warning(
                "Redis unavailable (%s) — running without cache. "
                "Set REDIS_URL in .env to enable caching.",
                e,
            )
            self._disabled = True

    # ─── Low-level helpers ────────────────────────────────────────────────────

    def get(self, key: str) -> Optional[Any]:
        self._ensure_client()
        if self._disabled or self._client is None:
            return None
        try:
            value = self._client.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.warning("cache.get error: %s", e)
            return None

    def set(self, key: str, value: Any, ttl: int) -> None:
        self._ensure_client()
        if self._disabled or self._client is None:
            return
        try:
            self._client.setex(key, ttl, json.dumps(value, default=str))
        except Exception as e:
            logger.warning("cache.set error: %s", e)

    def delete(self, key: str) -> None:
        self._ensure_client()
        if self._disabled or self._client is None:
            return
        try:
            self._client.delete(key)
        except Exception as e:
            logger.warning("cache.delete error: %s", e)

    # ─── Domain helpers ───────────────────────────────────────────────────────

    def get_repo_tree(self, repo_full_name: str) -> Optional[Any]:
        return self.get(f"cache:repo_tree:{repo_full_name}")

    def set_repo_tree(self, repo_full_name: str, tree: Any) -> None:
        self.set(f"cache:repo_tree:{repo_full_name}", tree, _REPO_TREE_TTL)

    def get_issue(self, repo_full_name: str, issue_number: int) -> Optional[Any]:
        return self.get(f"cache:issue:{repo_full_name}:{issue_number}")

    def set_issue(self, repo_full_name: str, issue_number: int, data: Any) -> None:
        self.set(f"cache:issue:{repo_full_name}:{issue_number}", data, _ISSUE_TTL)

    def get_health(self, repo_full_name: str) -> Optional[Any]:
        return self.get(f"cache:health:{repo_full_name}")

    def set_health(self, repo_full_name: str, report: Any) -> None:
        self.set(f"cache:health:{repo_full_name}", report, _HEALTH_TTL)


cache = CacheService()
