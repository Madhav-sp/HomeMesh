from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security.dependencies import get_current_user
from app.core.security.device_auth import get_current_device

from app.infrastructure.database.dependencies import get_db

from app.modules.devices import repository
from app.modules.devices.models import Device

from app.modules.devices.schemas import (
    DeviceRegister,
    DeviceResponse,
    PairingCodeResponse,
    PairDeviceRequest,
    PairDeviceResponse,
    HeartbeatRequest,
    HeartbeatResponse,
)

from app.modules.devices.service import (
    InvalidPairingCodeError,
    create_pairing_code,
    pair_device,
    process_heartbeat,
    register_device,
)

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


@router.post(
    "/{device_id}/pairing-code",
    response_model=PairingCodeResponse,
)
def generate_device_pairing_code(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = repository.get_by_id(db, device_id)

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Device not found.",
        )

    device = create_pairing_code(
        db=db,
        device=device,
    )

    return PairingCodeResponse(
        code=device.pairing_code,
        expires_at=device.pairing_expires_at,
    )


@router.post(
    "/pair",
    response_model=PairDeviceResponse,
)
def pair_device_endpoint(
    data: PairDeviceRequest,
    db: Session = Depends(get_db),
):
    try:
        device, token = pair_device(
            db=db,
            pairing_code=data.pairing_code,
        )
    except InvalidPairingCodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return PairDeviceResponse(
        device_id=device.id,
        device_token=token,
    )


@router.post(
    "/{device_id}/heartbeat",
    response_model=HeartbeatResponse,
)
def heartbeat(
    device_id: UUID,
    data: HeartbeatRequest,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    if current_device.id != device_id:
        raise HTTPException(
            status_code=403,
            detail="Device token does not match device.",
        )

    device = process_heartbeat(
        db=db,
        device=current_device,
        cpu_percent=data.cpu_percent,
        memory_percent=data.memory_percent,
        memory_used=data.memory_used,
        memory_total=data.memory_total,
        disk_percent=data.disk_percent,
        disk_used=data.disk_used,
        disk_total=data.disk_total,
    )

    return HeartbeatResponse(
        status=device.status,
        last_seen=device.last_seen,
    )
