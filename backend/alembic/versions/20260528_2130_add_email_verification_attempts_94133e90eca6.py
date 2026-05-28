"""add_email_verification_attempts

Revision ID: 94133e90eca6
Revises: 3a1a52c2c66f
Create Date: 2026-05-28 21:30:57.712114

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94133e90eca6'
down_revision: Union[str, Sequence[str], None] = '3a1a52c2c66f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('email_verification_attempts', sa.Integer(), server_default=sa.text('0'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'email_verification_attempts')
