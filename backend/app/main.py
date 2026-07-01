from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import contributor, review, webhooks
from app.core.config import settings
import logging

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# ─── CORS ──────────────────────────────────────────────────────────────────────
# Use the explicit origins list from settings rather than wildcard.
# Explicit origins + allow_credentials=True enables cookie/auth flows;
# wildcard "*" would break them.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────────────────────
app.include_router(contributor.router, prefix=f"{settings.API_V1_STR}/contributor", tags=["contributor"])
app.include_router(review.router, prefix=f"{settings.API_V1_STR}/review", tags=["review"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
