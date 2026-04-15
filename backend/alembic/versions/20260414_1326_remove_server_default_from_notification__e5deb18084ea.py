"""remove_server_default_from_notification_created_at

Revision ID: e5deb18084ea
Revises: 4968358e72ce
Create Date: 2026-04-14 13:26:00.262421

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = 'e5deb18084ea'
down_revision: str | Sequence[str] | None = '4968358e72ce'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
