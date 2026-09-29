"""add compute jobs table

Revision ID: add_compute_jobs
Revises: 96d7f2b34f32
Create Date: 2026-09-29

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "add_compute_jobs"
down_revision = "create_transfers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "compute_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_compute_jobs_owner_id"), "compute_jobs", ["owner_id"], unique=False)
    op.create_index(op.f("ix_compute_jobs_target_device_id"), "compute_jobs", ["target_device_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_compute_jobs_target_device_id"), table_name="compute_jobs")
    op.drop_index(op.f("ix_compute_jobs_owner_id"), table_name="compute_jobs")
    op.drop_table("compute_jobs")
