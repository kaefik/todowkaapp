"""add_email_verification_code_expires_at

Revision ID: 3a1a52c2c66f
Revises: 33c6c95a45d3
Create Date: 2026-05-28 21:16:44.824591

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3a1a52c2c66f'
down_revision: Union[str, Sequence[str], None] = '33c6c95a45d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email_verification_code_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'email_verification_code_expires_at')
