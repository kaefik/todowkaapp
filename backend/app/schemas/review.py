from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TaskReviewItem(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    due_date: datetime | None = None


class ProjectReviewItem(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    has_next_action: bool
    next_actions: list[TaskReviewItem] = []
    available_tasks: list[TaskReviewItem] = []


class ReviewStatusResponse(BaseModel):
    inbox_count: int
    inbox_tasks: list[TaskReviewItem]
    active_projects: list[ProjectReviewItem]
    someday_tasks: list[TaskReviewItem]
    last_review_date: datetime | None = None
    review_count: int


class ReviewCompleteResponse(BaseModel):
    success: bool
    review_count: int
    completed_at: str
