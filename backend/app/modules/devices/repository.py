from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.devices.models import Device
from app.modules.devices.heartbeat_model import Heartbeat
from app.modules.devices.storage_model import DeviceStorage
from app.modules.devices.photo_model import DevicePhoto
from app.modules.devices.transfer_model import Transfer


# =========================================================
# DEVICE
# =========================================================

def create(
    db: Session,
    owner_id: UUID,
    name: str,
) -> Device:
    device = Device(
        owner_id=owner_id,
        name=name,
        status="pending",
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
) -> list[tuple[Device, Heartbeat | None]]:
    devices = list(
        db.scalars(
            select(Device)
            .where(Device.owner_id == owner_id)
            .order_by(Device.created_at.desc())
        )
    )

    return [
        (device, get_latest_heartbeat(db, device.id))
        for device in devices
    ]


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


def get_heartbeat_history(
    db: Session,
    device_id: UUID,
    minutes: int = 5,
) -> list[Heartbeat]:
    cutoff = datetime.now(timezone.utc) - timedelta(
        minutes=minutes
    )

    return list(
        db.scalars(
            select(Heartbeat)
            .where(
                Heartbeat.device_id == device_id,
                Heartbeat.created_at >= cutoff,
            )
            .order_by(Heartbeat.created_at.asc())
        )
    )


def delete(
    db: Session,
    device: Device,
) -> None:
    db.delete(device)
    db.commit()


# =========================================================
# DEVICE STORAGE
# =========================================================

def get_device_storage(
    db: Session,
    device_id: UUID,
) -> list[DeviceStorage]:
    return list(
        db.scalars(
            select(DeviceStorage)
            .where(
                DeviceStorage.device_id == device_id
            )
            .order_by(DeviceStorage.mount_point.asc())
        )
    )


def replace_device_storage(
    db: Session,
    device_id: UUID,
    storage_data: list[dict],
) -> list[DeviceStorage]:
    db.query(DeviceStorage).filter(
        DeviceStorage.device_id == device_id
    ).delete(
        synchronize_session=False
    )

    storage_records = []

    for item in storage_data:
        storage = DeviceStorage(
            device_id=device_id,
            mount_point=item["mount_point"],
            filesystem=item.get("filesystem"),
            total_bytes=item["total_bytes"],
            used_bytes=item["used_bytes"],
            free_bytes=item["free_bytes"],
            usage_percent=item["usage_percent"],
        )

        db.add(storage)
        storage_records.append(storage)

    db.commit()

    for storage in storage_records:
        db.refresh(storage)

    return storage_records


# =========================================================
# DEVICE PHOTOS
# =========================================================

def _mtime_changed(existing_mtime, incoming_mtime) -> bool:
    if existing_mtime is None and incoming_mtime is None:
        return False
    if existing_mtime is None or incoming_mtime is None:
        return True
    try:
        ex_str = existing_mtime.isoformat()[:19]
        inc_str = (
            incoming_mtime.isoformat()[:19]
            if hasattr(incoming_mtime, "isoformat")
            else str(incoming_mtime)[:19]
        )
        return ex_str != inc_str
    except Exception:
        return False


def sync_device_photos(
    db: Session,
    device_id: UUID,
    photos_data: list[dict],
) -> list[DevicePhoto]:

    existing_photos = {
        photo.file_path: photo
        for photo in db.scalars(
            select(DevicePhoto).where(
                DevicePhoto.device_id == device_id
            )
        )
    }

    current_paths = {
        item["file_path"]
        for item in photos_data
    }

    synced_photos = []

    # ---------------------------------------------------------
    # Remove photos that no longer exist on the device
    # ---------------------------------------------------------

    for file_path, photo in existing_photos.items():
        if file_path not in current_paths:
            db.delete(photo)

    # ---------------------------------------------------------
    # Sync current photos
    # ---------------------------------------------------------

    for item in photos_data:

        file_path = item["file_path"]

        existing = existing_photos.get(file_path)

        if existing:

            size_changed = (
                existing.file_size != item["file_size"]
            )

            existing.file_name = item["file_name"]
            existing.file_size = item["file_size"]
            existing.mime_type = item.get("mime_type")
            existing.modified_at = item.get(
                "modified_at"
            )

            # -------------------------------------------------
            # Only clear backend storage when file_size has
            # actually changed AND this is a normal photo.
            # We rely on file_size rather than modified_at
            # because the timestamp comparison is unreliable
            # across timezone-aware/naive datetime formats.
            # -------------------------------------------------

            if size_changed and not item.get(
                "is_transferred",
                False,
            ):
                existing.storage_path = None

            synced_photos.append(existing)

        else:

            # -------------------------------------------------
            # New photo
            # -------------------------------------------------

            photo = DevicePhoto(
                device_id=device_id,
                file_name=item["file_name"],
                file_path=file_path,
                file_size=item["file_size"],
                mime_type=item.get("mime_type"),
                modified_at=item.get("modified_at"),
                storage_path=None,
            )

            db.add(photo)
            synced_photos.append(photo)

    db.commit()

    for photo in synced_photos:
        db.refresh(photo)

    return synced_photos


def get_device_photos(
    db: Session,
    device_id: UUID,
) -> list[DevicePhoto]:
    return list(
        db.scalars(
            select(DevicePhoto)
            .where(
                DevicePhoto.device_id == device_id
            )
            .order_by(
                DevicePhoto.modified_at.desc()
            )
        )
    )


def get_photo_by_id(
    db: Session,
    photo_id: UUID,
) -> DevicePhoto | None:
    return db.scalar(
        select(DevicePhoto).where(DevicePhoto.id == photo_id)
    )


def get_all_user_photos(
    db: Session,
    owner_id: UUID,
    device_id: UUID | None = None,
) -> list[tuple[DevicePhoto, Device]]:
    query = (
        select(DevicePhoto, Device)
        .join(Device, DevicePhoto.device_id == Device.id)
        .where(Device.owner_id == owner_id)
    )
    if device_id:
        query = query.where(DevicePhoto.device_id == device_id)
    query = query.order_by(DevicePhoto.created_at.desc())
    return list(db.execute(query).tuples())


def delete_photo(
    db: Session,
    photo: DevicePhoto,
) -> None:
    db.delete(photo)
    db.commit()


# =========================================================
# TRANSFERS
# =========================================================

def create_transfer(
    db: Session,
    owner_id: UUID,
    target_device_id: UUID,
    file_name: str,
    file_path: str,
    file_size: int,
    mime_type: str | None,
) -> Transfer:

    transfer = Transfer(
        owner_id=owner_id,
        target_device_id=target_device_id,
        file_name=file_name,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        status="pending",
    )

    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    return transfer


def get_pending_transfers(
    db: Session,
    device_id: UUID,
) -> list[Transfer]:

    return list(
        db.scalars(
            select(Transfer)
            .where(
                Transfer.target_device_id == device_id,
                Transfer.status == "pending",
            )
            .order_by(
                Transfer.created_at.asc()
            )
        )
    )


def get_transfer(
    db: Session,
    transfer_id: UUID,
) -> Transfer | None:

    return db.scalar(
        select(Transfer).where(
            Transfer.id == transfer_id
        )
    )


def get_user_transfers(
    db: Session,
    owner_id: UUID,
) -> list[Transfer]:

    return list(
        db.scalars(
            select(Transfer)
            .where(
                Transfer.owner_id == owner_id
            )
            .order_by(
                Transfer.created_at.desc()
            )
        )
    )