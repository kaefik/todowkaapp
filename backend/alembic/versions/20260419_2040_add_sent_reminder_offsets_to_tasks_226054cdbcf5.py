"""add sent_reminder_offsets to tasks

Revision ID: 226054cdbcf5
Revises: 1043fac245e6
Create Date: 2026-04-19 20:40:24.429572

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

from alembic import op

revision: str = '226054cdbcf5'
down_revision: str | Sequence[str] | None = '1043fac245e6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sent_reminder_offsets', sqlite.JSON(), nullable=True))
    op.execute("UPDATE tasks SET sent_reminder_offsets = '[]' WHERE sent_reminder_offsets IS NULL")


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('sent_reminder_offsets')
