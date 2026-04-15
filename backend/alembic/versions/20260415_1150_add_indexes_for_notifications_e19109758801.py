"""add indexes for notifications

Revision ID: e19109758801
Revises: a32a2291d1c4
Create Date: 2026-04-15 11:50:18.622552

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e19109758801'
down_revision: str | Sequence[str] | None = 'a32a2291d1c4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id_is_read'), 'notifications', ['user_id', 'is_read'], unique=False)
    op.create_index(op.f('ix_notifications_user_id_created_at'), 'notifications', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_notifications_user_id_created_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id_is_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
