"""add_backup_schedules_table

Revision ID: 1c317004391a
Revises: 257e9261a354
Create Date: 2026-04-29 20:49:46.754476

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '1c317004391a'
down_revision: str | Sequence[str] | None = '257e9261a354'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('backup_schedules',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('enabled', sa.Boolean(), server_default='0', nullable=False),
    sa.Column('time', sa.String(length=5), nullable=False),
    sa.Column('period', sa.String(length=10), nullable=False),
    sa.Column('day_of_week', sa.Integer(), nullable=True),
    sa.Column('day_of_month', sa.Integer(), nullable=True),
    sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', name='uq_backup_schedules_user_id')
    )


def downgrade() -> None:
    op.drop_table('backup_schedules')
