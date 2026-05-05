"""add event_id to tasks

Revision ID: cdbbca882c19
Revises: 5e79c5729351
Create Date: 2026-05-05 10:26:34.696840

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdbbca882c19'
down_revision: Union[str, Sequence[str], None] = '5e79c5729351'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('event_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(None, 'tasks', 'calendar_events', ['event_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'event_id')
