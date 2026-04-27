"""add_sort_order_to_areas

Revision ID: a1b2c3d4e5f6
Revises: 33b56cdc53d5
Create Date: 2026-04-27 18:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: str | Sequence[str] | None = '33b56cdc53d5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('areas', sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('areas', 'sort_order')
