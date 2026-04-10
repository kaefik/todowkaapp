"""add_completed_at_to_tasks

Revision ID: aa554e189f47
Revises: 66f131828079
Create Date: 2026-04-10 15:15:58.734359

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'aa554e189f47'
down_revision: str | Sequence[str] | None = '66f131828079'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tasks', 'completed_at')
