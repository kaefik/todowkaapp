"""add_sessions_table

Revision ID: a7f8e9d0c1b2
Revises: 1c317004391a
Create Date: 2026-04-30 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'a7f8e9d0c1b2'
down_revision: str | Sequence[str] | None = '1c317004391a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('refresh_token_jti', sa.String(length=36), nullable=False),
        sa.Column('user_agent_raw', sa.Text(), nullable=True),
        sa.Column('browser', sa.String(length=100), nullable=True),
        sa.Column('os', sa.String(length=100), nullable=True),
        sa.Column('device_type', sa.String(length=20), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('refresh_token_jti', name='uq_sessions_refresh_token_jti')
    )
    op.create_index('ix_sessions_user_id', 'sessions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_sessions_user_id', table_name='sessions')
    op.drop_table('sessions')
