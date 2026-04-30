"""add_telegram_fields_to_user

Revision ID: t9g8h7j6k5l4
Revises: d18986b50bbf
Create Date: 2026-04-26 12:50:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 't9g8h7j6k5l4'
down_revision: str | Sequence[str] | None = 'd18986b50bbf'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('telegram_bot_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('telegram_chat_id', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('telegram_notifications_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'telegram_notifications_enabled')
    op.drop_column('users', 'telegram_chat_id')
    op.drop_column('users', 'telegram_bot_token')
