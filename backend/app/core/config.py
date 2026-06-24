from typing import List, Union
from pydantic import AnyHttpUrl, field_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Open Source Mentee Agent"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/mentee_agent_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub — token pool (comma-separated list) + legacy single token
    GITHUB_TOKENS: List[str] = []
    GITHUB_TOKEN: str = ""  # backward-compat single token fallback

    @field_validator("GITHUB_TOKENS", mode="before")
    def assemble_github_tokens(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and v:
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [t for t in v if t]
        return []

    # API Keys
    GEMINI_API_KEY: str = ""

    # LLM model configuration
    # gemini-2.0-flash has limit=0 on the free tier; use gemini-3.1-flash-lite.
    LLM_MODEL: str = "gemini-3.1-flash-lite"
    LLM_FALLBACK_MODEL: str = "gemini-3.1-flash-lite"
    EMBEDDING_MODEL: str = "gemini-embedding-001"

    # Rate-limit retry settings (applied automatically in _LazyLLM.invoke)
    # Free tier: 15 RPM → wait ~5s between retries is usually enough.
    RATE_LIMIT_MAX_RETRIES: int = 4
    RATE_LIMIT_BASE_DELAY: float = 10.0   # seconds; doubles each retry (exp backoff)

    # Token / size limits (overridable via env vars)
    MAX_TREE_ITEMS: int = 200
    MAX_README_CHARS: int = 1500
    MAX_ISSUE_BODY_CHARS: int = 2000
    MAX_PR_FILES: int = 20
    MAX_PR_PATCH_CHARS: int = 500
    MAX_CODE_AGENT_TREE_ITEMS: int = 300
    MAX_AFFECTED_FILES: int = 10  # TRD §3.4: "up to 10" files

    # Duplicate detection
    DUPLICATE_SIMILARITY_THRESHOLD: int = 85

    # Chroma vector store
    CHROMA_PATH: str = ".chroma"

    # Webhook
    GITHUB_WEBHOOK_SECRET: str = ""

    # GitHub OAuth (for NextAuth)
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Auth toggle — set to True once OAuth is fully wired
    AUTH_ENABLED: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
