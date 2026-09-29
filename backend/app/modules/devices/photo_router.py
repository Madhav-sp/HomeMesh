import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.security.dependencies import get_current_user
from app.infrastructure.database.dependencies import get_db
from app.modules.devices import repository
from app.modules.devices.router import PHOTO_STORAGE_ROOT
from app.modules.users.models import User

router = APIRouter(
    prefix="/api/v1/photos",
    tags=["Photos"],
)


@router.get("")
def list_user_photos(
    device_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = repository.get_all_user_photos(
        db=db,
        owner_id=current_user.id,
        device_id=device_id,
    )

    response = []
    for photo, device in results:
        image_url = None
        if photo.storage_path:
            image_url = f"/api/v1/devices/{device.id}/photos/{photo.id}/image"

        response.append(
            {
                "id": photo.id,
                "device_id": device.id,
                "device_name": device.name,
                "file_name": photo.file_name,
                "file_path": photo.file_path,
                "file_size": photo.file_size,
                "mime_type": photo.mime_type,
                "modified_at": photo.modified_at,
                "created_at": photo.created_at,
                "uploaded": photo.storage_path is not None,
                "image_url": image_url,
            }
        )

    return response


@router.get("/{photo_id}")
def get_photo_details(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = repository.get_photo_by_id(db=db, photo_id=photo_id)
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    device = repository.get_by_id(db=db, device_id=photo.device_id)
    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    image_url = None
    if photo.storage_path:
        image_url = f"/api/v1/devices/{device.id}/photos/{photo.id}/image"

    return {
        "id": photo.id,
        "device_id": device.id,
        "device_name": device.name,
        "file_name": photo.file_name,
        "file_path": photo.file_path,
        "file_size": photo.file_size,
        "mime_type": photo.mime_type,
        "modified_at": photo.modified_at,
        "created_at": photo.created_at,
        "uploaded": photo.storage_path is not None,
        "image_url": image_url,
    }


@router.get("/{photo_id}/download")
def download_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = repository.get_photo_by_id(db=db, photo_id=photo_id)
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    device = repository.get_by_id(db=db, device_id=photo.device_id)
    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    if not photo.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file has not been uploaded to backend yet.",
        )

    file_path = os.path.join(PHOTO_STORAGE_ROOT, photo.storage_path)

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found on disk.",
        )

    return FileResponse(
        path=file_path,
        media_type=photo.mime_type or "application/octet-stream",
        filename=photo.file_name,
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo_endpoint(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = repository.get_photo_by_id(db=db, photo_id=photo_id)
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    device = repository.get_by_id(db=db, device_id=photo.device_id)
    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    if photo.storage_path:
        file_path = os.path.join(PHOTO_STORAGE_ROOT, photo.storage_path)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    repository.delete_photo(db=db, photo=photo)
