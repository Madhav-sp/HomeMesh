from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security.dependencies import get_current_user
from app.core.security.device_auth import get_current_device
from app.infrastructure.database.dependencies import get_db

from app.modules.devices import repository
from app.modules.devices.models import Device
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
    StorageUpdateRequest,
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
        db=db,
        device_id=device_id,
    )

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    # Device cannot be paired again while it already
    # has a valid device token.
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
    # Make sure the device token belongs to the
    # device whose heartbeat is being submitted.
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
        cpu_cores=data.cpu_cores,
        cpu_threads=data.cpu_threads,
        cpu_frequency_mhz=data.cpu_frequency_mhz,
        uptime_seconds=data.uptime_seconds,
    )

    return HeartbeatResponse(
        status=device.status,
        last_seen=device.last_seen,
    )


# =========================================================
# DELETE DEVICE
# =========================================================

@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_device(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = repository.get_by_id(
        db=db,
        device_id=device_id,
    )

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    repository.delete(
        db=db,
        device=device,
    )


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

            # Compute information
            "cpu_cores": heartbeat.cpu_cores,
            "cpu_threads": heartbeat.cpu_threads,
            "cpu_frequency_mhz": heartbeat.cpu_frequency_mhz,
            "uptime_seconds": heartbeat.uptime_seconds,

            "created_at": heartbeat.created_at,
        }

    # Get latest storage information
    storage = repository.get_device_storage(
        db=db,
        device_id=device.id,
    )

    storage_response = [
        {
            "mount_point": item.mount_point,
            "filesystem": item.filesystem,
            "total_bytes": item.total_bytes,
            "used_bytes": item.used_bytes,
            "free_bytes": item.free_bytes,
            "usage_percent": item.usage_percent,
        }
        for item in storage
    ]

    return {
        "id": device.id,
        "name": device.name,
        "hostname": device.hostname,
        "os": device.os,
        "agent_version": device.agent_version,
        "status": device.status,
        "last_seen": device.last_seen,
        "latest_metrics": metrics,
        "storage": storage_response,
    }


# =========================================================
# METRIC HISTORY
# =========================================================

@router.get(
    "/{device_id}/metrics/history",
)
def get_metric_history(
    device_id: UUID,
    minutes: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = repository.get_by_id(
        db=db,
        device_id=device_id,
    )

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    if minutes not in [5, 30, 60]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="minutes must be 5, 30, or 60.",
        )

    heartbeats = repository.get_heartbeat_history(
        db=db,
        device_id=device_id,
        minutes=minutes,
    )

    return [
        {
            "cpu_percent": heartbeat.cpu_percent,
            "memory_percent": heartbeat.memory_percent,
            "disk_percent": heartbeat.disk_percent,
            "created_at": heartbeat.created_at,
        }
        for heartbeat in heartbeats
    ]


# =========================================================
# DEVICE STORAGE - AGENT UPDATE
# =========================================================

@router.post(
    "/{device_id}/storage",
)
def update_device_storage(
    device_id: UUID,
    data: StorageUpdateRequest,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    if current_device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device token does not match device.",
        )

    storage_records = repository.replace_device_storage(
        db=db,
        device_id=device_id,
        storage_data=[
            partition.model_dump()
            for partition in data.storage
        ],
    )

    return {
        "device_id": device_id,
        "partitions": len(storage_records),
    }


# =========================================================
# DEVICE STORAGE - VIEW
# =========================================================

@router.get(
    "/{device_id}/storage",
)
def get_device_storage(
    device_id: UUID,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    if current_device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device token does not match device.",
        )

    storage = repository.get_device_storage(
        db=db,
        device_id=device_id,
    )

    return [
        {
            "mount_point": item.mount_point,
            "filesystem": item.filesystem,
            "total_bytes": item.total_bytes,
            "used_bytes": item.used_bytes,
            "free_bytes": item.free_bytes,
            "usage_percent": item.usage_percent,
        }
        for item in storage
    ]