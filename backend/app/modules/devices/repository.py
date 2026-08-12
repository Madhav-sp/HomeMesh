from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.devices.models import Device


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