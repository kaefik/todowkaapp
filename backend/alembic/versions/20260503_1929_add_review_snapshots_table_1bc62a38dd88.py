"""add review_snapshots table

Revision ID: 1bc62a38dd88
Revises: cd8d572b3d0b
Create Date: 2026-05-03 19:29:18.319935

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1bc62a38dd88'
down_revision: Union[str, Sequence[str], None] = 'cd8d572b3d0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('review_snapshots',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('inbox_count', sa.Integer(), nullable=False),
    sa.Column('overdue_count', sa.Integer(), nullable=False),
    sa.Column('done_count', sa.Integer(), nullable=False),
    sa.Column('stale_count', sa.Integer(), nullable=False),
    sa.Column('projects_without_next', sa.Integer(), nullable=False),
    sa.Column('health_status', sa.String(length=20), nullable=False),
    sa.Column('inbox_processed', sa.Integer(), nullable=False),
    sa.Column('next_actions_added', sa.Integer(), nullable=False),
    sa.Column('someday_activated', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_review_snapshots_user_created', 'review_snapshots', ['user_id', 'created_at'], unique=False)
    op.create_index('ix_review_snapshots_user_id', 'review_snapshots', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_review_snapshots_user_id', table_name='review_snapshots')
    op.drop_index('ix_review_snapshots_user_created', table_name='review_snapshots')
    op.drop_table('review_snapshots')
