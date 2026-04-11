from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.task import GtdStatus


class TagBriefResponse(BaseModel):
    id: UUID
    name: str
    color: str | None

    model_config = {
        'from_attributes': True
    }


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    gtd_status: GtdStatus = GtdStatus.INBOX
    context_id: str | None = Field(default=None, max_length=36)
    area_id: str | None = Field(default=None, max_length=36)
    project_id: str | None = Field(default=None, max_length=36)
    parent_task_id: str | None = Field(default=None, max_length=36)
    due_date: datetime | None = None
    notes: str | None = None
    tag_ids: list[str] | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_completed: bool | None = None
    gtd_status: GtdStatus | None = None
    context_id: str | None = Field(default=None, max_length=36)
    area_id: str | None = Field(default=None, max_length=36)
    project_id: str | None = Field(default=None, max_length=36)
    parent_task_id: str | None = Field(default=None, max_length=36)
    due_date: datetime | None = None
    notes: str | None = None
    tag_ids: list[str] | None = None


class TaskMoveRequest(BaseModel):
    gtd_status: GtdStatus


class TaskReorderRequest(BaseModel):
    position: int = Field(ge=0)


class TaskResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str | None
    is_completed: bool
    completed_at: datetime | None
    gtd_status: str
    context_id: UUID | None
    area_id: UUID | None
    project_id: UUID | None
    parent_task_id: UUID | None
    position: int
    due_date: datetime | None
    notes: str | None
    tags: list[TagBriefResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int


class GtdCountsResponse(BaseModel):
    inbox: int = 0
    next: int = 0
    waiting: int = 0
    someday: int = 0
    completed: int = 0
    trash: int = 0
