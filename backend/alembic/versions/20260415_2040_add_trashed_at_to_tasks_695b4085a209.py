"""add_trashed_at_to_tasks

Revision ID: 695b4085a209
Revises: 6f8e7a2d9b1c
Create Date: 2026-04-15 20:40:06.735373

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '695b4085a209'
down_revision: str | Sequence[str] | None = '6f8e7a2d9b1c'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('trashed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_tasks_trashed_at', 'tasks', ['gtd_status', 'trashed_at'])


def downgrade() -> None:
    op.drop_index('ix_tasks_trashed_at', table_name='tasks')
    op.drop_column('tasks', 'trashed_at')
