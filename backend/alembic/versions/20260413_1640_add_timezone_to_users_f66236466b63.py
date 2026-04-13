"""add_timezone_to_users

Revision ID: f66236466b63
Revises: c3d4e5f6a7b8
Create Date: 2026-04-13 16:40:03.905603

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f66236466b63'
down_revision: str | Sequence[str] | None = 'c3d4e5f6a7b8'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('timezone', sa.String(50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'timezone')
