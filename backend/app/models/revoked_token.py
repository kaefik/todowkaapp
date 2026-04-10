from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base as Base


class RevokedToken(Base):
    __tablename__ = 'revoked_tokens'

    token_jti: Mapped[str] = mapped_column(String(36), primary_key=True, nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f'<RevokedToken(jti={self.token_jti}, revoked_at={self.revoked_at})>'
