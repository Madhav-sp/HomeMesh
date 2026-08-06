from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config.settings import settings
from app.core.logging.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting HomeMesh API")
    yield
    logger.info("🛑 Stopping HomeMesh API")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.app_name}"
    }