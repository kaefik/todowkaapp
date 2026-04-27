"""add language field to user

Revision ID: 33b56cdc53d5
Revises: 4e2600c113f0
Create Date: 2026-04-27 12:18:46.124199

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '33b56cdc53d5'
down_revision: Union[str, Sequence[str], None] = '4e2600c113f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('language', sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'language')
