import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class TaskRecurrence(Base):
    __tablename__ = 'task_recurrences'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    generated_task_id: Mapped[str] = mapped_column(String(36), ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    due_date_of_generated_task: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='completed')

    task = relationship('Task', foreign_keys=[task_id], back_populates='recurrences')
    generated_task = relationship('Task', foreign_keys=[generated_task_id], backref='recurrence_generations')

    def __repr__(self) -> str:
        return f'<TaskRecurrence(id={self.id}, task_id={self.task_id}, status={self.status})>'
