"""add deleted_entities table

Revision ID: 8c4dd29b7261
Revises: add_event_recurrences_table
Create Date: 2026-05-18 21:15:53.796681

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c4dd29b7261'
down_revision: Union[str, Sequence[str], None] = 'add_event_recurrences_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('deleted_entities',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('entity_type', sa.String(length=50), nullable=False),
    sa.Column('entity_id', sa.String(length=36), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deleted_entities_user_id'), 'deleted_entities', ['user_id'], unique=False)
    op.create_index('ix_deleted_entities_user_type_time', 'deleted_entities', ['user_id', 'entity_type', 'deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_deleted_entities_user_type_time', table_name='deleted_entities')
    op.drop_index(op.f('ix_deleted_entities_user_id'), table_name='deleted_entities')
    op.drop_table('deleted_entities')
