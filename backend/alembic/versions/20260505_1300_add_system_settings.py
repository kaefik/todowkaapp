"""add system_settings table

Revision ID: add_system_settings
Revises: add_email_notification_fields
Create Date: 2026-05-05 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_system_settings'
down_revision: Union[str, Sequence[str], None] = 'add_email_notification_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'system_settings',
        sa.Column('key', sa.String(length=100), primary_key=True),
        sa.Column('value', sa.String(length=500), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('system_settings')