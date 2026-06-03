"""add_digest_settings

Revision ID: 66a30c0b454f
Revises: 377d72a57c73
Create Date: 2026-06-03 14:22:30.044362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '66a30c0b454f'
down_revision: Union[str, Sequence[str], None] = '377d72a57c73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('digest_enabled', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('digest_time', sa.String(length=5), nullable=True))
    op.add_column('users', sa.Column('digest_last_sent', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'digest_last_sent')
    op.drop_column('users', 'digest_time')
    op.drop_column('users', 'digest_enabled')
