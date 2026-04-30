"""add verb_templates table

Revision ID: d18986b50bbf
Revises: 049a3a3a7f9b
Create Date: 2026-04-24 20:54:48.019660

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'd18986b50bbf'
down_revision: str | Sequence[str] | None = '049a3a3a7f9b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'verb_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.String(30), nullable=False),
        sa.Column('icon', sa.String(10), nullable=False),
        sa.Column('position', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('verb_templates')
