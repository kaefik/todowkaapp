from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')


class TagResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    color: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class TagListResponse(BaseModel):
    items: list[TagResponse]
    total: int


class TaskTagOperation(BaseModel):
    tag_id: str = Field(max_length=36)
