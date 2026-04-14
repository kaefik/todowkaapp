"""set_default_timezone_for_users

Revision ID: 4968358e72ce
Revises: 42dc15b81a10
Create Date: 2026-04-14 13:15:07.847608

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4968358e72ce'
down_revision: Union[str, Sequence[str], None] = '42dc15b81a10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE users SET timezone = 'Europe/Moscow' WHERE timezone IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    pass
