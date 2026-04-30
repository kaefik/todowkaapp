"""add deadline_notified to task

Revision ID: 4e2600c113f0
Revises: t9g8h7j6k5l4
Create Date: 2026-04-26 19:32:00.683036

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '4e2600c113f0'
down_revision: str | Sequence[str] | None = 't9g8h7j6k5l4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('deadline_notified', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('tasks', 'deadline_notified')
