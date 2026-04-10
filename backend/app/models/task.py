import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class GtdStatus(enum.StrEnum):
    INBOX = 'inbox'
    NEXT = 'next'
    WAITING = 'waiting'
    SOMEDAY = 'someday'
    COMPLETED = 'completed'
    TRASH = 'trash'


class Task(Base):
    __tablename__ = 'tasks'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gtd_status: Mapped[str] = mapped_column(
        String(20), default=GtdStatus.INBOX.value, nullable=False
    )
    context_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('contexts.id', ondelete='SET NULL'), nullable=True
    )
    area_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('areas.id', ondelete='SET NULL'), nullable=True
    )
    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True
    )
    parent_task_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship('User', back_populates='tasks')
    context = relationship('Context', back_populates='tasks')
    area = relationship('Area', back_populates='tasks')
    project = relationship('Project', back_populates='tasks')
    parent_task = relationship('Task', remote_side='Task.id', back_populates='subtasks')
    subtasks = relationship('Task', back_populates='parent_task', cascade='all, delete-orphan')
    tags = relationship('Tag', secondary='task_tags', back_populates='tasks', lazy='selectin')

    __table_args__ = (
        Index('ix_tasks_user_id_is_completed', 'user_id', 'is_completed'),
        Index('ix_tasks_user_gtd_status', 'user_id', 'gtd_status'),
        Index('ix_tasks_user_context_id', 'user_id', 'context_id'),
        Index('ix_tasks_user_area_id', 'user_id', 'area_id'),
        Index('ix_tasks_user_project_id', 'user_id', 'project_id'),
        Index('ix_tasks_parent_task_id', 'parent_task_id'),
        Index('ix_tasks_user_due_date', 'user_id', 'due_date'),
        Index('ix_tasks_user_position', 'user_id', 'position'),
    )

    def __repr__(self) -> str:
        return f'<Task(id={self.id}, title={self.title}, user_id={self.user_id}, gtd_status={self.gtd_status})>'
