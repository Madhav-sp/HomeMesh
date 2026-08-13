from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.devices import repository
from app.modules.devices.models import Device
import secrets
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
from datetime import datetime, timezone

from app.modules.devices.heartbeat_model import Heartbeat
def register_device(
    db: Session,
    owner_id: UUID,
    name: str,
    hostname: str,
    os: str,
    agent_version: str,
) -> Device:
    return repository.create(
        db=db,
        owner_id=owner_id,
        name=name,
        hostname=hostname,
        os=os,
        agent_version=agent_version,
    )

def generate_pairing_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

def create_pairing_code(
    db: Session,
    device: Device,
) -> Device:
    device.pairing_code = generate_pairing_code()
    device.pairing_expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=10)
    )

    db.commit()
    db.refresh(device)

    return device

def generate_device_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    return token, token_hash

class InvalidPairingCodeError(Exception):
    pass


def pair_device(
    db: Session,
    pairing_code: str,
) -> tuple[Device, str]:

    device = repository.get_by_pairing_code(
        db,
        pairing_code,
    )

    if device is None:
        raise InvalidPairingCodeError(
            "Invalid pairing code."
        )

    if (
        device.pairing_expires_at is None
        or device.pairing_expires_at
        < datetime.now(timezone.utc)
    ):
        raise InvalidPairingCodeError(
            "Pairing code has expired."
        )

    token, token_hash = generate_device_token()

    device.device_token_hash = token_hash

    # Code can only be used once
    device.pairing_code = None
    device.pairing_expires_at = None

    db.commit()
    db.refresh(device)

    return device, token

def process_heartbeat(
    db: Session,
    device: Device,
    cpu_percent: float | None,
    memory_percent: float | None,
    memory_used: int | None,
    memory_total: int | None,
    disk_percent: float | None,
    disk_used: int | None,
    disk_total: int | None,
) -> Device:

    heartbeat = Heartbeat(
        device_id=device.id,
        cpu_percent=cpu_percent,
        memory_percent=memory_percent,
        memory_used=memory_used,
        memory_total=memory_total,
        disk_percent=disk_percent,
        disk_used=disk_used,
        disk_total=disk_total,
    )

    db.add(heartbeat)

    device.status = "online"
    device.last_seen = datetime.now(timezone.utc)

    db.commit()
    db.refresh(device)

    return device