"""add email notification fields to users

Revision ID: add_email_notification_fields
Revises: cdbbca882c19
Create Date: 2026-05-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_email_notification_fields'
down_revision: Union[str, Sequence[str], None] = 'cdbbca882c19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add email notification fields to users table."""
    op.add_column('users', sa.Column('email_notifications_enabled', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('notification_email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_verification_code', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove email notification fields from users table."""
    op.drop_column('users', 'email_verified_at')
    op.drop_column('users', 'email_verification_code')
    op.drop_column('users', 'notification_email')
    op.drop_column('users', 'email_notifications_enabled')