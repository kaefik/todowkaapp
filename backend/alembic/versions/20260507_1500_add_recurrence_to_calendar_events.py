"""Add recurrence fields to calendar_events

Revision ID: add_recurrence_to_calendar_events
Revises: add_location_and_attendees_to_calendar_events
Create Date: 2026-05-07 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_recurrence_to_calendar_events'
down_revision = 'add_system_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('calendar_events', sa.Column('recurrence_type', sa.String(20), nullable=True))
    op.add_column('calendar_events', sa.Column('recurrence_config', sa.JSON(), nullable=True))
    op.add_column('calendar_events', sa.Column('recurrence_end_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('calendar_events', 'recurrence_end_date')
    op.drop_column('calendar_events', 'recurrence_config')
    op.drop_column('calendar_events', 'recurrence_type')