"""extend tasks with gtd fields

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-10 20:02:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'c3d4e5f6a7b8'
down_revision: str | Sequence[str] | None = 'b2c3d4e5f6a7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gtd_status', sa.String(length=20), nullable=False, server_default='inbox'))
        batch_op.add_column(sa.Column('context_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('area_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('project_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('parent_task_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('position', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))

        batch_op.create_foreign_key('fk_tasks_context_id', 'contexts', ['context_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_tasks_area_id', 'areas', ['area_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_tasks_project_id', 'projects', ['project_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_tasks_parent_task_id', 'tasks', ['parent_task_id'], ['id'], ondelete='CASCADE')

        batch_op.create_index('ix_tasks_user_gtd_status', ['user_id', 'gtd_status'])
        batch_op.create_index('ix_tasks_user_context_id', ['user_id', 'context_id'])
        batch_op.create_index('ix_tasks_user_area_id', ['user_id', 'area_id'])
        batch_op.create_index('ix_tasks_user_project_id', ['user_id', 'project_id'])
        batch_op.create_index('ix_tasks_parent_task_id', ['parent_task_id'])
        batch_op.create_index('ix_tasks_user_due_date', ['user_id', 'due_date'])
        batch_op.create_index('ix_tasks_user_position', ['user_id', 'position'])


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_tasks_user_position')
        batch_op.drop_index('ix_tasks_user_due_date')
        batch_op.drop_index('ix_tasks_parent_task_id')
        batch_op.drop_index('ix_tasks_user_project_id')
        batch_op.drop_index('ix_tasks_user_area_id')
        batch_op.drop_index('ix_tasks_user_context_id')
        batch_op.drop_index('ix_tasks_user_gtd_status')

        batch_op.drop_constraint('fk_tasks_parent_task_id', type_='foreignkey')
        batch_op.drop_constraint('fk_tasks_project_id', type_='foreignkey')
        batch_op.drop_constraint('fk_tasks_area_id', type_='foreignkey')
        batch_op.drop_constraint('fk_tasks_context_id', type_='foreignkey')

        batch_op.drop_column('notes')
        batch_op.drop_column('due_date')
        batch_op.drop_column('position')
        batch_op.drop_column('parent_task_id')
        batch_op.drop_column('project_id')
        batch_op.drop_column('area_id')
        batch_op.drop_column('context_id')
        batch_op.drop_column('gtd_status')
