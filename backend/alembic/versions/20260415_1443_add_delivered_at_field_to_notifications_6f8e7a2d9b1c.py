"""add delivered_at field to notifications

Revision ID: 6f8e7a2d9b1c
Revises: e19109758801
Create Date: 2026-04-15 14:38:07.533035

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '6f8e7a2d9b1c'
down_revision: str | Sequence[str] | None = 'e19109758801'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add delivered_at column to notifications table."""
    op.add_column('notifications', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove delivered_at column from notifications table."""
    op.drop_column('notifications', 'delivered_at')
