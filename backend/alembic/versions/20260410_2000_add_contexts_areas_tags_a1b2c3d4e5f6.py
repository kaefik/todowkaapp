"""add contexts areas tags tables

Revision ID: a1b2c3d4e5f6
Revises: aa554e189f47
Create Date: 2026-04-10 20:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: str | Sequence[str] | None = 'aa554e189f47'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('contexts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_contexts_user_id'), 'contexts', ['user_id'], unique=False)
    op.create_index('ix_contexts_user_name', 'contexts', ['user_id', 'name'], unique=True)

    op.create_table('areas',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_areas_user_id'), 'areas', ['user_id'], unique=False)
    op.create_index('ix_areas_user_name', 'areas', ['user_id', 'name'], unique=True)

    op.create_table('tags',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_tags_user_id'), 'tags', ['user_id'], unique=False)
    op.create_index('ix_tags_user_name', 'tags', ['user_id', 'name'], unique=True)

    op.create_table('task_tags',
        sa.Column('task_id', sa.String(length=36), nullable=False),
        sa.Column('tag_id', sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint('task_id', 'tag_id'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_task_tags_task_id'), 'task_tags', ['task_id'], unique=False)
    op.create_index(op.f('ix_task_tags_tag_id'), 'task_tags', ['tag_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_task_tags_tag_id'), table_name='task_tags')
    op.drop_index(op.f('ix_task_tags_task_id'), table_name='task_tags')
    op.drop_table('task_tags')

    op.drop_index('ix_tags_user_name', table_name='tags')
    op.drop_index(op.f('ix_tags_user_id'), table_name='tags')
    op.drop_table('tags')

    op.drop_index('ix_areas_user_name', table_name='areas')
    op.drop_index(op.f('ix_areas_user_id'), table_name='areas')
    op.drop_table('areas')

    op.drop_index('ix_contexts_user_name', table_name='contexts')
    op.drop_index(op.f('ix_contexts_user_id'), table_name='contexts')
    op.drop_table('contexts')
