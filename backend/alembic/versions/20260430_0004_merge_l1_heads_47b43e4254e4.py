"""merge_l1_heads

Revision ID: 47b43e4254e4
Revises: 8f2a3b4c5d6e, a7f8e9d0c1b2, b7e8f9a0c1d2
Create Date: 2026-04-30 00:04:01.564524

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = '47b43e4254e4'
down_revision: str | Sequence[str] | None = ('8f2a3b4c5d6e', 'a7f8e9d0c1b2', 'b7e8f9a0c1d2')
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
