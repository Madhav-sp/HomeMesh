from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security.dependencies import get_current_user
from app.infrastructure.database.dependencies import get_db
from app.modules.devices import repository
from app.modules.devices.schemas import (
    DeviceRegister,
    DeviceResponse,
)
from app.modules.devices.service import register_device
from app.modules.users.models import User


router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Devices"],
)


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_device(
    data: DeviceRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return register_device(
        db=db,
        owner_id=current_user.id,
        name=data.name,
        hostname=data.hostname,
        os=data.os,
        agent_version=data.agent_version,
    )


@router.get(
    "",
    response_model=list[DeviceResponse],
)
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return repository.get_by_owner(
        db=db,
        owner_id=current_user.id,
    )