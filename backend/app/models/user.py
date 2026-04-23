import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timezone: Mapped[str | None] = mapped_column(String(50), default='Europe/Moscow', nullable=True)
    default_section: Mapped[str] = mapped_column(String(30), default='inbox', nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default=text('0'), nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tasks = relationship('Task', back_populates='user', cascade='all, delete-orphan')
    contexts = relationship('Context', back_populates='user', cascade='all, delete-orphan')
    areas = relationship('Area', back_populates='user', cascade='all, delete-orphan')
    tags = relationship('Tag', back_populates='user', cascade='all, delete-orphan')
    projects = relationship('Project', back_populates='user', cascade='all, delete-orphan')

    def __repr__(self) -> str:
        return f'<User(id={self.id}, username={self.username}, email={self.email})>'
