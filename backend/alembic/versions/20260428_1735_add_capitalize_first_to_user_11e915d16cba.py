"""add_capitalize_first_to_user

Revision ID: 11e915d16cba
Revises: a1b2c3d4e5f6_checklist
Create Date: 2026-04-28 17:35:49.802009

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '11e915d16cba'
down_revision: str | Sequence[str] | None = 'a1b2c3d4e5f6_checklist'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('capitalize_first', sa.Boolean(), server_default=sa.text('1'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'capitalize_first')
