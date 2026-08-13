import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class Heartbeat(Base):
    __tablename__ = "heartbeats"

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

    cpu_percent: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    memory_percent: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    memory_used: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    memory_total: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    disk_percent: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    disk_used: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    disk_total: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )