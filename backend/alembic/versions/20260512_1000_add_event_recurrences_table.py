"""Add event_recurrences table

Revision ID: add_event_recurrences_table
Revises: add_recurrence_to_calendar_events
Create Date: 2026-05-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_event_recurrences_table'
down_revision = 'add_recurrence_to_calendar_events'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'event_recurrences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('event_id', sa.String(36), sa.ForeignKey('calendar_events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('generated_event_id', sa.String(36), sa.ForeignKey('calendar_events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('start_time_of_generated_event', sa.DateTime(timezone=True), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='completed'),
    )
    op.create_index('ix_event_recurrences_event_id', 'event_recurrences', ['event_id'])


def downgrade() -> None:
    op.drop_index('ix_event_recurrences_event_id', table_name='event_recurrences')
    op.drop_table('event_recurrences')
