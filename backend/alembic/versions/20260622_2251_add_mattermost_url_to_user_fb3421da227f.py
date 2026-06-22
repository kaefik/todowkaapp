"""add mattermost_url to user

Revision ID: fb3421da227f
Revises: b0f1e7304573
Create Date: 2026-06-22 22:51:11.789225

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'fb3421da227f'
down_revision: str | Sequence[str] | None = 'b0f1e7304573'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('mattermost_url', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'mattermost_url')
