from fastapi import APIRouter

from app.api.endpoints import contributor, admin, review

api_router = APIRouter()
api_router.include_router(contributor.router, prefix="/contributor", tags=["contributor"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(review.router, prefix="/review", tags=["review"])
