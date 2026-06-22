"""add mattermost fields to user

Revision ID: b0f1e7304573
Revises: 66a30c0b454f
Create Date: 2026-06-22 22:07:15.118816

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b0f1e7304573'
down_revision: Union[str, Sequence[str], None] = '66a30c0b454f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('mattermost_user_id', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('mattermost_bot_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('mattermost_notifications_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False))
    op.add_column('users', sa.Column('mattermost_channel_id', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'mattermost_channel_id')
    op.drop_column('users', 'mattermost_notifications_enabled')
    op.drop_column('users', 'mattermost_bot_token')
    op.drop_column('users', 'mattermost_user_id')
