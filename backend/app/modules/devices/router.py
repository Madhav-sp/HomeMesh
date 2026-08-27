from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security.dependencies import get_current_user
from app.core.security.device_auth import get_current_device
from app.infrastructure.database.dependencies import get_db

from app.modules.devices import repository
from app.modules.devices.models import Device
from app.modules.devices.monitor import mark_stale_devices_offline
from app.modules.devices.schemas import (
    DeviceCreate,
    DeviceDetailResponse,
    DeviceListResponse,
    DeviceResponse,
    HeartbeatRequest,
    HeartbeatResponse,
    PairDeviceRequest,
    PairDeviceResponse,
    PairingCodeResponse,
)
from app.modules.devices.service import (
    InvalidPairingCodeError,
    create_pairing_code,
    get_device_details,
    pair_device,
    process_heartbeat,
    register_device,
)
from app.modules.users.models import User


router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Devices"],
)


# =========================================================
# CREATE PENDING DEVICE
# =========================================================

@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_device(
    data: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return register_device(
        db=db,
        owner_id=current_user.id,
        name=data.name,
    )


# =========================================================
# LIST DEVICES
# =========================================================

@router.get(
    "",
    response_model=list[DeviceListResponse],
)
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    devices = repository.get_by_owner(
        db=db,
        owner_id=current_user.id,
    )

    response = []

    for device, heartbeat in devices:
        metrics = None

        if heartbeat:
            metrics = {
                "cpu_percent": heartbeat.cpu_percent,
                "memory_percent": heartbeat.memory_percent,
                "memory_used": heartbeat.memory_used,
                "memory_total": heartbeat.memory_total,
                "disk_percent": heartbeat.disk_percent,
                "disk_used": heartbeat.disk_used,
                "disk_total": heartbeat.disk_total,
                "created_at": heartbeat.created_at,
            }

        response.append(
            {
                "id": device.id,
                "name": device.name,
                "hostname": device.hostname,
                "os": device.os,
                "agent_version": device.agent_version,
                "status": device.status,
                "last_seen": device.last_seen,
                "created_at": device.created_at,
                "updated_at": device.updated_at,
                "latest_metrics": metrics,
            }
        )

    return response


# =========================================================
# GENERATE PAIRING CODE
# =========================================================

@router.post(
    "/{device_id}/pairing-code",
    response_model=PairingCodeResponse,
)
def generate_device_pairing_code(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = repository.get_by_id(
        db,
        device_id,
    )

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    # Only pending/offline devices should be paired.
    if device.device_token_hash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device is already paired.",
        )

    device = create_pairing_code(
        db=db,
        device=device,
    )

    return PairingCodeResponse(
        code=device.pairing_code,
        expires_at=device.pairing_expires_at,
    )


# =========================================================
# PAIR AGENT
# =========================================================

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
            hostname=data.hostname,
            os=data.os,
            agent_version=data.agent_version,
        )

    except InvalidPairingCodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return PairDeviceResponse(
        device_id=device.id,
        device_token=token,
    )


# =========================================================
# HEARTBEAT
# =========================================================

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
            status_code=status.HTTP_403_FORBIDDEN,
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


# =========================================================
# OFFLINE MONITOR
# =========================================================

@router.post("/monitor/offline")
def check_offline_devices(
    db: Session = Depends(get_db),
):
    count = mark_stale_devices_offline(db)

    return {
        "marked_offline": count,
    }


# =========================================================
# DEVICE DETAILS
# =========================================================

@router.get(
    "/{device_id}",
    response_model=DeviceDetailResponse,
)
def get_device(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = get_device_details(
        db=db,
        device_id=device_id,
        owner_id=current_user.id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    device, heartbeat = result

    metrics = None

    if heartbeat:
        metrics = {
            "cpu_percent": heartbeat.cpu_percent,
            "memory_percent": heartbeat.memory_percent,
            "memory_used": heartbeat.memory_used,
            "memory_total": heartbeat.memory_total,
            "disk_percent": heartbeat.disk_percent,
            "disk_used": heartbeat.disk_used,
            "disk_total": heartbeat.disk_total,
            "created_at": heartbeat.created_at,
        }

    return {
        "id": device.id,
        "name": device.name,
        "hostname": device.hostname,
        "os": device.os,
        "agent_version": device.agent_version,
        "status": device.status,
        "last_seen": device.last_seen,
        "latest_metrics": metrics,
    }

    