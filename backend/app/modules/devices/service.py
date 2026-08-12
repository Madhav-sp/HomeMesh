from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.devices import repository
from app.modules.devices.models import Device


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