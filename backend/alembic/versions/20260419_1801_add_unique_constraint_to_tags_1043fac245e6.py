"""add unique constraint to tags

Revision ID: 1043fac245e6
Revises: 5e55c2ba49f5
Create Date: 2026-04-19 18:01:19.279498

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '1043fac245e6'
down_revision: Union[str, Sequence[str], None] = '5e55c2ba49f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_tags_user_name', ['user_id', 'name'])


def downgrade() -> None:
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.drop_constraint('uq_tags_user_name', type_='unique')
