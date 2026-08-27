from datetime import datetime, timedelta, timezone
from uuid import UUID
import hashlib
import secrets

from sqlalchemy.orm import Session

from app.modules.devices import repository
from app.modules.devices.heartbeat_model import Heartbeat
from app.modules.devices.models import Device


# ---------------------------------------------------------
# DEVICE REGISTRATION
# ---------------------------------------------------------

def register_device(
    db: Session,
    owner_id: UUID,
    name: str,
) -> Device:
    """
    Create a new pending device.

    The user only provides the device name.
    The Agent provides hostname, OS and agent version
    during the pairing process.
    """
    return repository.create(
        db=db,
        owner_id=owner_id,
        name=name,
    )


# ---------------------------------------------------------
# PAIRING CODE
# ---------------------------------------------------------

def generate_pairing_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_pairing_code(
    db: Session,
    device: Device,
) -> Device:
    device.pairing_code = generate_pairing_code()

    device.pairing_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=10)
    )

    db.commit()
    db.refresh(device)

    return device


# ---------------------------------------------------------
# DEVICE TOKEN
# ---------------------------------------------------------

def generate_device_token() -> tuple[str, str]:
    """
    Generate the raw device token and its SHA-256 hash.

    The raw token is returned to the Agent only once.
    Only the hash is stored in the database.
    """
    token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    return token, token_hash


# ---------------------------------------------------------
# PAIRING
# ---------------------------------------------------------

class InvalidPairingCodeError(Exception):
    pass


def pair_device(
    db: Session,
    pairing_code: str,
    hostname: str,
    os: str,
    agent_version: str,
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

    # Generate device authentication token
    token, token_hash = generate_device_token()

    # Agent provides the actual machine information
    device.hostname = hostname
    device.os = os
    device.agent_version = agent_version

    # Store only the token hash
    device.device_token_hash = token_hash

    # Pairing code can only be used once
    device.pairing_code = None
    device.pairing_expires_at = None

    # Pairing succeeded, but Agent has not sent
    # a heartbeat yet.
    device.status = "offline"

    db.commit()
    db.refresh(device)

    return device, token


# ---------------------------------------------------------
# HEARTBEAT
# ---------------------------------------------------------

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

    # Heartbeat means Agent is currently alive
    device.status = "online"
    device.last_seen = datetime.now(timezone.utc)

    db.commit()
    db.refresh(device)

    return device


# ---------------------------------------------------------
# DEVICE DETAILS
# ---------------------------------------------------------

def get_device_details(
    db: Session,
    device_id: UUID,
    owner_id: UUID,
):
    device = repository.get_by_id(
        db,
        device_id,
    )

    if device is None or device.owner_id != owner_id:
        return None

    heartbeat = repository.get_latest_heartbeat(
        db,
        device_id,
    )

    return device, heartbeat