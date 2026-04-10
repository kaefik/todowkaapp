"""add_revoked_tokens_table

Revision ID: 66f131828079
Revises: 6e177ba42dbf
Create Date: 2026-04-10 15:03:19.805226

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '66f131828079'
down_revision: str | Sequence[str] | None = '6e177ba42dbf'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('revoked_tokens',
    sa.Column('token_jti', sa.String(length=36), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('token_jti')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('revoked_tokens')
