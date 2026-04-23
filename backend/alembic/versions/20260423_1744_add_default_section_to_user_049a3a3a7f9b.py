"""add default_section to user

Revision ID: 049a3a3a7f9b
Revises: ac8b74eb67c9
Create Date: 2026-04-23 17:44:56.389288

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '049a3a3a7f9b'
down_revision: str | Sequence[str] | None = 'ac8b74eb67c9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('default_section', sa.String(30), server_default='inbox', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'default_section')
