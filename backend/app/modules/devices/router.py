import os
import uuid
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
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
    PhotoUpdateRequest,
)

from app.modules.devices.service import (
    InvalidPairingCodeError,
    create_pairing_code,
    get_device_details,
    pair_device,
    process_heartbeat,
    register_device,
)

from app.modules.devices.transfer_model import Transfer
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
            "cpu_cores": heartbeat.cpu_cores,
            "cpu_threads": heartbeat.cpu_threads,
            "cpu_frequency_mhz": heartbeat.cpu_frequency_mhz,
            "uptime_seconds": heartbeat.uptime_seconds,
            "created_at": heartbeat.created_at,
        }

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


# =========================================================
# DEVICE PHOTOS - AGENT UPDATE
# =========================================================

@router.post(
    "/{device_id}/photos",
)
def update_device_photos(
    device_id: UUID,
    data: PhotoUpdateRequest,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    if current_device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device token does not match device.",
        )

    photo_records = repository.sync_device_photos(
        db=db,
        device_id=device_id,
        photos_data=[
            photo.model_dump()
            for photo in data.photos
        ],
    )

    photos_to_upload = [
        {
            "id": photo.id,
            "file_path": photo.file_path,
        }
        for photo in photo_records
        if photo.storage_path is None
    ]

    return {
        "device_id": device_id,
        "photos": len(photo_records),
        "photos_to_upload": photos_to_upload,
    }


# =========================================================
# DEVICE PHOTOS - VIEW
# =========================================================

@router.get(
    "/{device_id}/photos",
)
def get_device_photos(
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

    photos = repository.get_device_photos(
        db=db,
        device_id=device_id,
    )

    response = []

    for photo in photos:

        image_url = None

        # -----------------------------------------------------
        # Normal photo
        # -----------------------------------------------------

        if photo.storage_path:
            image_url = (
                f"/api/v1/devices/"
                f"{device_id}/photos/"
                f"{photo.id}/image"
            )

        else:
            # -------------------------------------------------
            # Check whether this photo came from a completed
            # HomeMesh transfer.
            #
            # The transferred file already exists on the
            # backend because the browser originally uploaded
            # it to create the transfer.
            # -------------------------------------------------

            transfer = db.scalar(
                repository.select(
                    Transfer
                ).where(
                    Transfer.target_device_id == device_id,
                    Transfer.file_name == photo.file_name,
                    Transfer.status == "completed",
                ).order_by(
                    Transfer.completed_at.desc()
                )
            ) if hasattr(repository, "select") else None

            if transfer:
                image_url = (
                    f"/api/v1/devices/"
                    f"{device_id}/photos/"
                    f"{photo.id}/image"
                )

        response.append(
            {
                "id": photo.id,
                "file_name": photo.file_name,
                "file_path": photo.file_path,
                "file_size": photo.file_size,
                "mime_type": photo.mime_type,
                "modified_at": photo.modified_at,
                "created_at": photo.created_at,
                "uploaded": (
                    photo.storage_path is not None
                ),
                "image_url": image_url,
            }
        )

    return response


# =========================================================
# DEVICE PHOTO - ACTUAL FILE UPLOAD
# =========================================================

PHOTO_STORAGE_ROOT = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "storage",
        "photos",
    )
)


@router.post(
    "/{device_id}/photos/upload",
)
async def upload_device_photo(
    device_id: UUID,
    file_path: str = Form(...),
    file: UploadFile = File(...),
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Verify device token
    # -----------------------------------------------------

    if current_device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device token does not match device.",
        )

    # -----------------------------------------------------
    # Find metadata record
    # -----------------------------------------------------

    photos = repository.get_device_photos(
        db=db,
        device_id=device_id,
    )

    photo = next(
        (
            item
            for item in photos
            if item.file_path == file_path
        ),
        None,
    )

    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo metadata not found.",
        )

    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type.",
        )

    # -----------------------------------------------------
    # Create device storage directory
    # -----------------------------------------------------

    device_directory = os.path.join(
        PHOTO_STORAGE_ROOT,
        str(device_id),
    )

    os.makedirs(
        device_directory,
        exist_ok=True,
    )

    # -----------------------------------------------------
    # Generate safe backend filename
    # -----------------------------------------------------

    extension = os.path.splitext(
        photo.file_name
    )[1].lower()

    safe_filename = (
        str(uuid.uuid4()) + extension
    )

    destination = os.path.join(
        device_directory,
        safe_filename,
    )

    # -----------------------------------------------------
    # Save file
    # -----------------------------------------------------

    max_file_size = 25 * 1024 * 1024

    total_size = 0

    try:
        with open(destination, "wb") as output:

            while True:
                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > max_file_size:
                    output.close()

                    if os.path.exists(destination):
                        os.remove(destination)

                    raise HTTPException(
                        status_code=(
                            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                        ),
                        detail="Image is larger than 25 MB.",
                    )

                output.write(chunk)

    finally:
        await file.close()

    # -----------------------------------------------------
    # Save storage path in database
    # -----------------------------------------------------

    photo.storage_path = os.path.relpath(
        destination,
        PHOTO_STORAGE_ROOT,
    )

    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.id,
        "file_name": photo.file_name,
        "uploaded": True,
        "size": total_size,
    }


# =========================================================
# DEVICE PHOTO - SERVE IMAGE
# =========================================================

@router.get(
    "/{device_id}/photos/{photo_id}/image",
)
def get_device_photo_image(
    device_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Verify device belongs to user
    # -----------------------------------------------------

    device = repository.get_by_id(
        db=db,
        device_id=device_id,
    )

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    # -----------------------------------------------------
    # Find photo
    # -----------------------------------------------------

    photos = repository.get_device_photos(
        db=db,
        device_id=device_id,
    )

    photo = next(
        (
            item
            for item in photos
            if item.id == photo_id
        ),
        None,
    )

    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    # -----------------------------------------------------
    # NORMAL BACKEND PHOTO
    # -----------------------------------------------------

    if photo.storage_path:

        full_path = os.path.abspath(
            os.path.join(
                PHOTO_STORAGE_ROOT,
                photo.storage_path,
            )
        )

        # Prevent path traversal
        if not full_path.startswith(
            PHOTO_STORAGE_ROOT + os.sep
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid photo path.",
            )

        if not os.path.isfile(full_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image file not found.",
            )

        return FileResponse(
            path=full_path,
            media_type=(
                photo.mime_type
                or "application/octet-stream"
            ),
            filename=photo.file_name,
        )

    # -----------------------------------------------------
    # TRANSFERRED PHOTO FALLBACK
    # -----------------------------------------------------

    transfer = db.query(Transfer).filter(
        Transfer.target_device_id == device_id,
        Transfer.file_name == photo.file_name,
        Transfer.status == "completed",
    ).order_by(
        Transfer.completed_at.desc()
    ).first()

    if transfer:

        transfer_file = os.path.abspath(
            transfer.file_path
        )

        if not os.path.isfile(transfer_file):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transferred image file not found.",
            )

        return FileResponse(
            path=transfer_file,
            media_type=(
                transfer.mime_type
                or photo.mime_type
                or "application/octet-stream"
            ),
            filename=photo.file_name,
        )

    # -----------------------------------------------------
    # Nothing available
    # -----------------------------------------------------

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Photo has not been uploaded.",
    )