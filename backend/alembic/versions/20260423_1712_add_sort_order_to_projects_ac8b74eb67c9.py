"""add_sort_order_to_projects

Revision ID: ac8b74eb67c9
Revises: 12f70acb9834
Create Date: 2026-04-23 17:12:16.967118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'ac8b74eb67c9'
down_revision: Union[str, Sequence[str], None] = '12f70acb9834'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('projects', 'sort_order')
