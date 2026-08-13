import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config.settings import settings
from app.core.logging.logger import logger
from app.modules.devices.background import offline_monitor
from app.modules.devices.router import router as devices_router
from app.modules.users.router import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting HomeMesh API")

    monitor_task = asyncio.create_task(
        offline_monitor()
    )

    try:
        yield
    finally:
        monitor_task.cancel()

        try:
            await monitor_task
        except asyncio.CancelledError:
            pass

        logger.info("Stopping HomeMesh API")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)


app.include_router(api_router)
app.include_router(user_router)
app.include_router(devices_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.app_name}"
    }