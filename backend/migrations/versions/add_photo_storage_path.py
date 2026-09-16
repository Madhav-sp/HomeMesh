"""add storage path to device photos

Revision ID: 7c8a9d2e1f34
Revises: 1ee0541c5976
"""

from alembic import op
import sqlalchemy as sa


revision = "7c8a9d2e1f34"
down_revision = "1ee0541c5976"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "device_photos",
        sa.Column(
            "storage_path",
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "device_photos",
        "storage_path",
    )