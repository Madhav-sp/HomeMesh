from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.devices.models import Device
from datetime import datetime, timezone
from app.modules.devices.heartbeat_model import Heartbeat

def create(
    db: Session,
    owner_id: UUID,
    name: str,
    hostname: str,
    os: str,
    agent_version: str,
) -> Device:
    device = Device(
        owner_id=owner_id,
        name=name,
        hostname=hostname,
        os=os,
        agent_version=agent_version,
    )

    db.add(device)
    db.commit()
    db.refresh(device)

    return device


def get_by_id(
    db: Session,
    device_id: UUID,
) -> Device | None:
    return db.scalar(
        select(Device).where(Device.id == device_id)
    )


def get_by_owner(
    db: Session,
    owner_id: UUID,
) -> list[Device]:
    return list(
        db.scalars(
            select(Device)
            .where(Device.owner_id == owner_id)
            .order_by(Device.created_at.desc())
        )
    )





def get_by_pairing_code(
    db: Session,
    pairing_code: str,
) -> Device | None:
    return db.scalar(
        select(Device).where(
            Device.pairing_code == pairing_code
        )
    )

def get_by_token_hash(
    db: Session,
    token_hash: str,
) -> Device | None:
    return db.scalar(
        select(Device).where(
            Device.device_token_hash == token_hash
        )
    )

def get_latest_heartbeat(
    db: Session,
    device_id: UUID,
) -> Heartbeat | None:
    return db.scalar(
        select(Heartbeat)
        .where(Heartbeat.device_id == device_id)
        .order_by(Heartbeat.created_at.desc())
        .limit(1)
    )