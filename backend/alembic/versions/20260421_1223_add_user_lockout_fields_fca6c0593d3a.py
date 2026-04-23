"""add_user_lockout_fields

Revision ID: fca6c0593d3a
Revises: 226054cdbcf5
Create Date: 2026-04-21 12:23:32.929605

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'fca6c0593d3a'
down_revision: str | Sequence[str] | None = '226054cdbcf5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
