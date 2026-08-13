import asyncio

from app.infrastructure.database.session import SessionLocal
from app.modules.devices.monitor import mark_stale_devices_offline


async def offline_monitor():
    while True:
        db = SessionLocal()

        try:
            count = mark_stale_devices_offline(db)

            if count:
                print(f"Marked {count} device(s) offline")

        finally:
            db.close()

        await asyncio.sleep(10)