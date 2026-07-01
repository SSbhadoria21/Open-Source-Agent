from fastapi import APIRouter

from app.api.endpoints import contributor, review, webhooks

api_router = APIRouter()
api_router.include_router(contributor.router, prefix="/contributor", tags=["contributor"])
api_router.include_router(review.router, prefix="/review", tags=["review"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
