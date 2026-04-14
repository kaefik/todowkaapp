"""add reminder_time field

Revision ID: 42dc15b81a10
Revises: 85a447f5ff47
Create Date: 2026-04-14 11:13:15.369525

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '42dc15b81a10'
down_revision: str | Sequence[str] | None = '85a447f5ff47'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('reminder_time', sa.Time(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tasks', 'reminder_time')
