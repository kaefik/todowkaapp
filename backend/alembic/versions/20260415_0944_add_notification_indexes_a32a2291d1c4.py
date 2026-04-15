"""add notification indexes

Revision ID: a32a2291d1c4
Revises: e5deb18084ea
Create Date: 2026-04-15 09:44:39.285485

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a32a2291d1c4'
down_revision: str | Sequence[str] | None = 'e5deb18084ea'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index('ix_notifications_user_read', 'notifications', ['user_id', 'is_read'])
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', 'created_at'])
    op.create_index('ix_notifications_expires', 'notifications', ['expires_at'])


def downgrade() -> None:
    op.drop_index('ix_notifications_expires', table_name='notifications')
    op.drop_index('ix_notifications_user_created', table_name='notifications')
    op.drop_index('ix_notifications_user_read', table_name='notifications')
