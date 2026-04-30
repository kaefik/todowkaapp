"""add_user_id_indexes

Revision ID: b7e8f9a0c1d2
Revises: 1c317004391a
Create Date: 2026-04-30 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'b7e8f9a0c1d2'
down_revision: str | Sequence[str] | None = '1c317004391a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _index_exists(op, name):
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:name"),
        {"name": name}
    )
    return result.fetchone() is not None


def upgrade() -> None:
    if not _index_exists(op, 'ix_projects_user_id'):
        op.create_index('ix_projects_user_id', 'projects', ['user_id'])
    if not _index_exists(op, 'ix_areas_user_id'):
        op.create_index('ix_areas_user_id', 'areas', ['user_id'])
    if not _index_exists(op, 'ix_contexts_user_id'):
        op.create_index('ix_contexts_user_id', 'contexts', ['user_id'])
    if not _index_exists(op, 'ix_verb_templates_user_id'):
        op.create_index('ix_verb_templates_user_id', 'verb_templates', ['user_id'])
    if not _index_exists(op, 'ix_tasks_user_updated'):
        op.create_index('ix_tasks_user_updated', 'tasks', ['user_id', 'updated_at'])


def downgrade() -> None:
    op.drop_index('ix_tasks_user_updated', table_name='tasks')
    op.drop_index('ix_verb_templates_user_id', table_name='verb_templates')
    op.drop_index('ix_contexts_user_id', table_name='contexts')
    op.drop_index('ix_areas_user_id', table_name='areas')
    op.drop_index('ix_projects_user_id', table_name='projects')
