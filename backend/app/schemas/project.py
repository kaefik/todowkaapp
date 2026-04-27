from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import BaseResponseSchema


class ProjectCreate(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    area_id: str | None = Field(default=None, max_length=36)
    sort_order: int | None = Field(default=None, ge=0)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    area_id: str | None = Field(default=None, max_length=36)
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)


class ProjectResponse(BaseResponseSchema):
    id: UUID
    user_id: UUID
    area_id: UUID | None
    name: str
    description: str | None
    color: str | None
    is_active: bool
    sort_order: int
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


class ReorderItem(BaseModel):
    id: str = Field(max_length=36)
    sort_order: int = Field(ge=0)


class ProjectReorderRequest(BaseModel):
    items: list[ReorderItem] = Field(min_length=1, max_length=100)
