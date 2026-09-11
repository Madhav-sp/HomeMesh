import uuid

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class DeviceStorage(Base):
    __tablename__ = "device_storage"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mount_point: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    filesystem: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    total_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    used_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    free_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    usage_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )