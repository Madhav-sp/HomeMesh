import os
import uuid
from datetime import datetime, timezone
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
from app.modules.users.models import User


router = APIRouter(
    prefix="/api/v1/transfers",
    tags=["Transfers"],
)


TRANSFER_STORAGE_ROOT = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "storage",
        "transfers",
    )
)


# =========================================================
# CREATE TRANSFER
# WEBSITE → HOMeMESH
# =========================================================

@router.post("")
async def create_transfer(
    device_id: UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify target device belongs to current user
    device = repository.get_by_id(
        db=db,
        device_id=device_id,
    )

    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target device not found.",
        )

    # Target must be online
    if device.status != "online":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Target device is not online.",
        )

    # Only allow images for now
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

    os.makedirs(
        TRANSFER_STORAGE_ROOT,
        exist_ok=True,
    )

    original_filename = file.filename or "photo"

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    safe_filename = (
        str(uuid.uuid4()) + extension
    )

    destination = os.path.join(
        TRANSFER_STORAGE_ROOT,
        safe_filename,
    )

    max_file_size = 25 * 1024 * 1024
    total_size = 0

    try:
        with open(destination, "wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > max_file_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Image is larger than 25 MB.",
                    )

                output.write(chunk)

    except Exception:
        if os.path.exists(destination):
            os.remove(destination)
        raise

    finally:
        await file.close()

    transfer = repository.create_transfer(
        db=db,
        owner_id=current_user.id,
        target_device_id=device_id,
        file_name=original_filename,
        file_path=os.path.relpath(
            destination,
            TRANSFER_STORAGE_ROOT,
        ),
        file_size=total_size,
        mime_type=file.content_type,
    )

    return {
        "id": transfer.id,
        "file_name": transfer.file_name,
        "file_size": transfer.file_size,
        "target_device_id": transfer.target_device_id,
        "status": transfer.status,
    }


# =========================================================
# LIST USER TRANSFERS
# WEBSITE
# =========================================================

@router.get("")
def list_transfers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transfers = repository.get_user_transfers(
        db=db,
        owner_id=current_user.id,
    )

    return [
        {
            "id": transfer.id,
            "file_name": transfer.file_name,
            "file_size": transfer.file_size,
            "target_device_id": transfer.target_device_id,
            "status": transfer.status,
            "error_message": transfer.error_message,
            "created_at": transfer.created_at,
            "started_at": transfer.started_at,
            "completed_at": transfer.completed_at,
        }
        for transfer in transfers
    ]


# =========================================================
# GET PENDING TRANSFERS
# AGENT
# =========================================================

@router.get("/pending")
def get_pending_transfers_for_device(
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    transfers = repository.get_pending_transfers(
        db=db,
        device_id=current_device.id,
    )

    return [
        {
            "id": transfer.id,
            "file_name": transfer.file_name,
            "file_size": transfer.file_size,
            "mime_type": transfer.mime_type,
        }
        for transfer in transfers
    ]


# =========================================================
# DOWNLOAD TRANSFER
# AGENT
# =========================================================

@router.get("/{transfer_id}/download")
def download_transfer(
    transfer_id: UUID,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    transfer = repository.get_transfer(
        db=db,
        transfer_id=transfer_id,
    )

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found.",
        )

    if transfer.target_device_id != current_device.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Transfer does not belong to this device.",
        )

    # Mark as transferring
    if transfer.status == "pending":
        transfer.status = "transferring"
        transfer.started_at = datetime.now(timezone.utc)
        db.commit()

    full_path = os.path.abspath(
        os.path.join(
            TRANSFER_STORAGE_ROOT,
            transfer.file_path,
        )
    )

    # Prevent path traversal
    if not full_path.startswith(
        TRANSFER_STORAGE_ROOT + os.sep
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid transfer path.",
        )

    if not os.path.isfile(full_path):
        transfer.status = "failed"
        transfer.error_message = (
            "Transfer file not found."
        )
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer file not found.",
        )

    return FileResponse(
        path=full_path,
        media_type=(
            transfer.mime_type
            or "application/octet-stream"
        ),
        filename=transfer.file_name,
    )


# =========================================================
# COMPLETE TRANSFER
# AGENT → HOMeMESH
# =========================================================

@router.post("/{transfer_id}/complete")
def complete_transfer(
    transfer_id: UUID,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    transfer = repository.get_transfer(
        db=db,
        transfer_id=transfer_id,
    )

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found.",
        )

    if transfer.target_device_id != current_device.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Transfer does not belong to this device.",
        )

    transfer.status = "completed"
    transfer.completed_at = datetime.now(timezone.utc)
    transfer.error_message = None

    db.commit()

    return {
        "id": transfer.id,
        "status": transfer.status,
    }