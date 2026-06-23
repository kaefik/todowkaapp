"""add mattermost bot mode fields

Revision ID: 49e48d85e707
Revises: fb3421da227f
Create Date: 2026-06-23 15:38:19.785931

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49e48d85e707'
down_revision: Union[str, Sequence[str], None] = 'fb3421da227f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('mattermost_email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('mattermost_bind_mode', sa.String(length=20), server_default='pat', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'mattermost_bind_mode')
    op.drop_column('users', 'mattermost_email')
