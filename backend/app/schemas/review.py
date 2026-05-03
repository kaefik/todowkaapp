from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class TaskReviewItem(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    due_date: datetime | None = None
    created_at: datetime | None = None


class ProjectReviewItem(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    has_next_action: bool
    days_without_next: int = 0
    next_actions: list[TaskReviewItem] = []
    available_tasks: list[TaskReviewItem] = []


class ReviewAlert(BaseModel):
    severity: Literal['red', 'yellow']
    message: str
    project_id: str | None = None


class PreviousSnapshot(BaseModel):
    created_at: datetime
    inbox_count: int
    overdue_count: int
    done_count: int
    stale_count: int
    projects_without_next: int
    health_status: str


class ReviewSummaryResponse(BaseModel):
    inbox_count: int
    overdue_count: int
    done_this_week: int
    stale_count: int
    someday_count: int = 0
    projects_without_next: int
    health_status: Literal['ok', 'attention', 'problems']
    last_review_date: datetime | None = None
    review_count: int
    review_frequency_days: int = 7
    week_activity: dict[str, int] = {}
    alerts: list[ReviewAlert] = []
    previous_snapshot: PreviousSnapshot | None = None


class OverdueTaskItem(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    due_date: datetime | None = None
    gtd_status: str
    project_name: str | None = None


class ReviewStatusResponse(BaseModel):
    inbox_count: int
    inbox_tasks: list[TaskReviewItem]
    overdue_tasks: list[OverdueTaskItem] = []
    active_projects: list[ProjectReviewItem]
    someday_tasks: list[TaskReviewItem]
    last_review_date: datetime | None = None
    review_count: int


class ReviewCompleteResponse(BaseModel):
    success: bool
    review_count: int
    completed_at: str
    snapshot_health: str | None = None
