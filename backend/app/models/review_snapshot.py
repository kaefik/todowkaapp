import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class ReviewSnapshot(Base):
    __tablename__ = 'review_snapshots'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    inbox_count: Mapped[int] = mapped_column(Integer, nullable=False)
    overdue_count: Mapped[int] = mapped_column(Integer, nullable=False)
    done_count: Mapped[int] = mapped_column(Integer, nullable=False)
    stale_count: Mapped[int] = mapped_column(Integer, nullable=False)
    projects_without_next: Mapped[int] = mapped_column(Integer, nullable=False)
    health_status: Mapped[str] = mapped_column(String(20), nullable=False)
    inbox_processed: Mapped[int] = mapped_column(Integer, default=0)
    next_actions_added: Mapped[int] = mapped_column(Integer, default=0)
    someday_activated: Mapped[int] = mapped_column(Integer, default=0)

    user = relationship('User', back_populates='review_snapshots')

    __table_args__ = (
        Index('ix_review_snapshots_user_id', 'user_id'),
        Index('ix_review_snapshots_user_created', 'user_id', 'created_at'),
    )
