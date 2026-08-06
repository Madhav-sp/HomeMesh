from fastapi import APIRouter

from app.core.config.settings import settings

health_router = APIRouter(tags=["Health"])


@health_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
    }