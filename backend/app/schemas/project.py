from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    color: str | None = Field(default=None, max_length=7)
    area_id: str | None = Field(default=None, max_length=36)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    color: str | None = Field(default=None, max_length=7)
    area_id: str | None = Field(default=None, max_length=36)
    is_active: bool | None = None


class ProjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    area_id: UUID | None
    name: str
    description: str | None
    color: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class ProjectProgress(BaseModel):
    tasks_total: int
    tasks_completed: int
    progress_percent: float


class ProjectDetailResponse(ProjectResponse):
    progress: ProjectProgress


class ProjectListResponse(BaseModel):
    items: list[ProjectDetailResponse]
    total: int
