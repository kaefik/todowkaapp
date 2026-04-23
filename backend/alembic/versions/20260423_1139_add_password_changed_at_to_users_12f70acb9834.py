"""add_password_changed_at_to_users

Revision ID: 12f70acb9834
Revises: fca6c0593d3a
Create Date: 2026-04-23 11:39:43.907630

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '12f70acb9834'
down_revision: str | Sequence[str] | None = 'fca6c0593d3a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'password_changed_at')
