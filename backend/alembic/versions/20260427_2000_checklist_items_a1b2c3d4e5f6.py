"""create checklist_items table and migrate subtasks

Revision ID: a1b2c3d4e5f6_checklist
Revises: f7a8b9c0d1e2
Create Date: 2026-04-27

"""
import sqlalchemy as sa

from alembic import op

revision = 'a1b2c3d4e5f6_checklist'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'checklist_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_checklist_items_task_id', 'checklist_items', ['task_id'])

    op.execute("""
        INSERT INTO checklist_items (id, task_id, title, is_completed, position, completed_at, created_at, updated_at)
        SELECT
            t.id,
            t.parent_task_id,
            t.title,
            CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END,
            t.position,
            t.completed_at,
            t.created_at,
            t.updated_at
        FROM tasks t
        WHERE t.parent_task_id IS NOT NULL
    """)

    op.execute("DELETE FROM tasks WHERE parent_task_id IS NOT NULL")

    with op.batch_alter_table('tasks') as batch_op:
        batch_op.drop_index('ix_tasks_parent_task_id')
        batch_op.drop_column('parent_task_id')


def downgrade() -> None:
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.add_column(sa.Column('parent_task_id', sa.String(36), nullable=True))
        batch_op.create_index('ix_tasks_parent_task_id', ['parent_task_id'])
        batch_op.create_foreign_key('fk_tasks_parent_task_id', 'tasks', 'tasks', ['parent_task_id'], ['id'], ondelete='CASCADE')

    op.execute("""
        INSERT INTO tasks (id, user_id, title, description, is_completed, completed_at, gtd_status,
            context_id, area_id, project_id, parent_task_id, position, due_date, notes,
            recurrence_type, recurrence_config, recurrence_end_date,
            reminder_time, reminder_offsets, sent_reminder_offsets,
            reminder_fired, deadline_notified, last_reminder_sent_at, trashed_at,
            created_at, updated_at)
        SELECT
            ci.id,
            t.user_id,
            ci.title,
            NULL,
            ci.is_completed,
            ci.completed_at,
            'inbox',
            t.context_id,
            t.area_id,
            t.project_id,
            ci.task_id,
            ci.position,
            NULL,
            NULL,
            NULL, NULL, NULL,
            NULL, NULL, '[]',
            0, 0, NULL, NULL,
            ci.created_at,
            ci.updated_at
        FROM checklist_items ci
        JOIN tasks t ON t.id = ci.task_id
    """)

    op.drop_index('ix_checklist_items_task_id', table_name='checklist_items')
    op.drop_table('checklist_items')
