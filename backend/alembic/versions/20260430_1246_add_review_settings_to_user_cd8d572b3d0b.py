"""add review settings to user

Revision ID: cd8d572b3d0b
Revises: 47b43e4254e4
Create Date: 2026-04-30 12:46:46.311100

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'cd8d572b3d0b'
down_revision: str | Sequence[str] | None = '47b43e4254e4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('review_frequency_days', sa.Integer(), server_default=sa.text('7'), nullable=False))
    op.add_column('users', sa.Column('review_notifications_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'review_notifications_enabled')
    op.drop_column('users', 'review_frequency_days')
