from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.devices.models import Device


HEARTBEAT_TIMEOUT_SECONDS = 30


def mark_stale_devices_offline(db: Session) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(
        seconds=HEARTBEAT_TIMEOUT_SECONDS
    )

    devices = list(
        db.scalars(
            select(Device).where(
                Device.status == "online",
                Device.last_seen.is_not(None),
                Device.last_seen < cutoff,
            )
        )
    )

    for device in devices:
        device.status = "offline"

    if devices:
        db.commit()

    return len(devices)