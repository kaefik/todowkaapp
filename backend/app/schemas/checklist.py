from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import BaseResponseSchema


class ChecklistItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    position: int = 0


class ChecklistItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    is_completed: bool | None = None
    position: int | None = None


class ChecklistItemResponse(BaseResponseSchema):
    id: UUID
    task_id: UUID
    title: str
    is_completed: bool
    position: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class ChecklistItemListResponse(BaseModel):
    items: list[ChecklistItemResponse]
    total: int
