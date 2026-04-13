"""replace reminder_time_days_before with reminder_offsets

Revision ID: 85a447f5ff47
Revises: d88555989fc6
Create Date: 2026-04-13 21:17:10.525150

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '85a447f5ff47'
down_revision: str | Sequence[str] | None = 'd88555989fc6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('reminder_offsets', sa.JSON(), nullable=True))
    op.drop_column('tasks', 'reminder_days_before')
    op.drop_column('tasks', 'reminder_time')


def downgrade() -> None:
    op.add_column('tasks', sa.Column('reminder_time', sa.TIME(), nullable=True))
    op.add_column('tasks', sa.Column('reminder_days_before', sa.INTEGER(), nullable=True))
    op.drop_column('tasks', 'reminder_offsets')
