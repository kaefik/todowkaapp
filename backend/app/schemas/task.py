from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_completed: bool | None = None


class TaskResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str | None
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int
