import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class EventRecurrence(Base):
    __tablename__ = 'event_recurrences'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey('calendar_events.id', ondelete='CASCADE'), nullable=False)
    generated_event_id: Mapped[str] = mapped_column(String(36), ForeignKey('calendar_events.id', ondelete='CASCADE'), nullable=False)
    start_time_of_generated_event: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='completed')

    event = relationship('CalendarEvent', foreign_keys=[event_id], back_populates='recurrences')
    generated_event = relationship('CalendarEvent', foreign_keys=[generated_event_id], backref='recurrence_generations')

    def __repr__(self) -> str:
        return f'<EventRecurrence(id={self.id}, event_id={self.event_id}, status={self.status})>'