"""add location and attendees to calendar_events

Revision ID: 5e79c5729351
Revises: dac115d998d4
Create Date: 2026-05-05 10:24:59.847479

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e79c5729351'
down_revision: Union[str, Sequence[str], None] = 'dac115d998d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('calendar_events', sa.Column('location', sa.String(length=500), nullable=True))
    op.add_column('calendar_events', sa.Column('attendees', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('calendar_events', 'attendees')
    op.drop_column('calendar_events', 'location')
