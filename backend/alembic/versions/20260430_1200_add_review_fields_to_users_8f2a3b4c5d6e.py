"""add review fields to users

Revision ID: 8f2a3b4c5d6e
Revises: 1c317004391a
Create Date: 2026-04-30 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '8f2a3b4c5d6e'
down_revision: str | Sequence[str] | None = '1c317004391a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('last_review_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('review_count', sa.Integer(), server_default=sa.text('0'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'review_count')
    op.drop_column('users', 'last_review_at')
