import asyncio
import platform
import time

import psutil

from app.client import send_heartbeat, send_storage
from app.config import HEARTBEAT_INTERVAL


# ---------------------------------------------------------
# STORAGE COLLECTION
# ---------------------------------------------------------

def collect_storage() -> list:
    storage = []

    for partition in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(
                partition.mountpoint
            )

            storage.append(
                {
                    "mount_point": partition.mountpoint,
                    "filesystem": partition.fstype,
                    "total_bytes": usage.total,
                    "used_bytes": usage.used,
                    "free_bytes": usage.free,
                    "usage_percent": usage.percent,
                }
            )

        except (PermissionError, OSError):
            continue

    return storage


# ---------------------------------------------------------
# METRIC COLLECTION
# ---------------------------------------------------------

def collect_metrics() -> dict:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    cpu_frequency = psutil.cpu_freq()

    return {
        # CPU
        "cpu_percent": psutil.cpu_percent(
            interval=1
        ),
        "cpu_cores": psutil.cpu_count(
            logical=False
        ),
        "cpu_threads": psutil.cpu_count(
            logical=True
        ),
        "cpu_frequency_mhz": (
            cpu_frequency.current
            if cpu_frequency
            else None
        ),

        # Memory
        "memory_percent": memory.percent,
        "memory_used": memory.used,
        "memory_total": memory.total,

        # Overall disk
        "disk_percent": disk.percent,
        "disk_used": disk.used,
        "disk_total": disk.total,

        # System
        "hostname": platform.node(),
        "platform": platform.platform(),
        "uptime_seconds": int(
            time.time() - psutil.boot_time()
        ),

        # Storage partitions
        "storage": collect_storage(),
    }


# ---------------------------------------------------------
# HEARTBEAT LOOP
# ---------------------------------------------------------

async def heartbeat_loop(
    device_id: str,
    device_token: str,
):
    print("HomeMesh Agent started")

    while True:
        try:
            # Collect current metrics
            metrics = collect_metrics()

            print("\nSending heartbeat...")

            print(
                f"CPU: {metrics['cpu_percent']}%"
            )

            print(
                f"Memory: {metrics['memory_percent']}%"
            )

            print(
                f"Disk: {metrics['disk_percent']}%"
            )

            print(
                f"CPU cores: {metrics['cpu_cores']}"
            )

            print(
                f"CPU threads: {metrics['cpu_threads']}"
            )

            print(
                f"CPU frequency: "
                f"{metrics['cpu_frequency_mhz']} MHz"
            )

            print(
                f"Uptime: "
                f"{metrics['uptime_seconds']} seconds"
            )

            # -------------------------------------------------
            # SEND HEARTBEAT
            # -------------------------------------------------

            response = await send_heartbeat(
                device_id=device_id,
                device_token=device_token,
                payload=metrics,
            )

            print(
                f"Device status: "
                f"{response['status']}"
            )

            print(
                f"Last seen: "
                f"{response['last_seen']}"
            )

            # -------------------------------------------------
            # SEND STORAGE
            # -------------------------------------------------

            storage = metrics.get(
                "storage",
                []
            )

            if storage:
                storage_response = await send_storage(
                    device_id=device_id,
                    device_token=device_token,
                    storage=storage,
                )

                print(
                    "Storage partitions: "
                    f"{storage_response['partitions']}"
                )

                for partition in storage:
                    print(
                        f"  {partition['mount_point']} "
                        f"→ "
                        f"{partition['usage_percent']}%"
                    )

            else:
                print(
                    "No storage partitions detected."
                )

        except Exception as exc:
            print(
                f"Heartbeat failed: {exc}"
            )

        await asyncio.sleep(
            HEARTBEAT_INTERVAL
        )