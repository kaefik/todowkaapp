"""add_capitalize_first_to_user

Revision ID: 11e915d16cba
Revises: a1b2c3d4e5f6_checklist
Create Date: 2026-04-28 17:35:49.802009

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '11e915d16cba'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6_checklist'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('capitalize_first', sa.Boolean(), server_default=sa.text('1'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'capitalize_first')
