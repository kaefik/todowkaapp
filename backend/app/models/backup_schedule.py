import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class BackupSchedule(Base):
    __tablename__ = 'backup_schedules'
    __table_args__ = (
        UniqueConstraint('user_id', name='uq_backup_schedules_user_id'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default='0', nullable=False)
    time: Mapped[str] = mapped_column(String(5), nullable=False, default='03:00')
    period: Mapped[str] = mapped_column(String(10), nullable=False, default='daily')
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship('User', backref='backup_schedule')

    def __repr__(self) -> str:
        return f'<BackupSchedule(id={self.id}, user_id={self.user_id}, enabled={self.enabled})>'
