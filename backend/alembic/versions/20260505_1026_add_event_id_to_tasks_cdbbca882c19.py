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
    from sqlalchemy import text
    result = op.get_bind().execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'"))
    row = result.fetchone()
    if row and row[0] and 'event_id' not in row[0]:
        op.add_column('tasks', sa.Column('event_id', sa.String(length=36), nullable=True))
        op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_event_id ON tasks(event_id)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_tasks_event_id")
    op.drop_column('tasks', 'event_id')