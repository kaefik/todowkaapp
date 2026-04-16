"""add reminder_fired to task

Revision ID: 5e55c2ba49f5
Revises: 695b4085a209
Create Date: 2026-04-15 21:20:03.301692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '5e55c2ba49f5'
down_revision: Union[str, Sequence[str], None] = '695b4085a209'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('reminder_fired', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('tasks', 'reminder_fired')
