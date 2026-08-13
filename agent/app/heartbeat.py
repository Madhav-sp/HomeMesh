import asyncio
import platform

import psutil

from app.client import send_heartbeat
from app.config import HEARTBEAT_INTERVAL


def collect_metrics() -> dict:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": memory.percent,
        "memory_used": memory.used,
        "memory_total": memory.total,
        "disk_percent": disk.percent,
        "disk_used": disk.used,
        "disk_total": disk.total,
    }


async def heartbeat_loop():
    print("HomeMesh Agent started")

    while True:
        try:
            metrics = collect_metrics()

            print("Sending heartbeat...")
            print(metrics)

            response = await send_heartbeat(metrics)

            print(
                f"Device status: {response['status']}"
            )
            print(
                f"Last seen: {response['last_seen']}"
            )

        except Exception as exc:
            print(f"Heartbeat failed: {exc}")

        await asyncio.sleep(HEARTBEAT_INTERVAL)