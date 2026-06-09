"""expand_email_verification_code_column

Revision ID: 377d72a57c73
Revises: 94133e90eca6
Create Date: 2026-05-28 21:38:38.181143

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '377d72a57c73'
down_revision: str | Sequence[str] | None = '94133e90eca6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column(
            'email_verification_code',
            existing_type=sa.String(6),
            type_=sa.String(128),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column(
            'email_verification_code',
            existing_type=sa.String(128),
            type_=sa.String(6),
            existing_nullable=True,
        )
