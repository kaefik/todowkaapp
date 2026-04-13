"""add_recurrence_fields_and_new_tables

Revision ID: d88555989fc6
Revises: f66236466b63
Create Date: 2026-04-13 16:40:30.227855

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd88555989fc6'
down_revision: str | Sequence[str] | None = 'f66236466b63'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('recurrence_type', sa.String(20), nullable=True))
    op.add_column('tasks', sa.Column('recurrence_config', sa.JSON(), nullable=True))
    op.add_column('tasks', sa.Column('recurrence_end_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('reminder_time', sa.Time(), nullable=True))
    op.add_column('tasks', sa.Column('reminder_days_before', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('last_reminder_sent_at', sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        'task_recurrences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('generated_task_id', sa.String(36), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('due_date_of_generated_task', sa.DateTime(timezone=True), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, default='completed')
    )

    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('notifications')
    op.drop_table('task_recurrences')
    op.drop_column('tasks', 'last_reminder_sent_at')
    op.drop_column('tasks', 'reminder_days_before')
    op.drop_column('tasks', 'reminder_time')
    op.drop_column('tasks', 'recurrence_end_date')
    op.drop_column('tasks', 'recurrence_config')
    op.drop_column('tasks', 'recurrence_type')
