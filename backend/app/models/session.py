import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class Session(Base):
    __tablename__ = 'sessions'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    refresh_token_jti: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    user_agent_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    browser: Mapped[str | None] = mapped_column(String(100), nullable=True)
    os: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship('User', backref='sessions')

    def __repr__(self) -> str:
        return f'<Session(id={self.id}, user_id={self.user_id})>'
