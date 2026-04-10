from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    context_id: UUID | None = None

    @field_validator('context_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_completed: bool | None = None
    context_id: UUID | None = None

    @field_validator('context_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v


class TaskResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str | None
    is_completed: bool
    completed_at: datetime | None
    context_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int
