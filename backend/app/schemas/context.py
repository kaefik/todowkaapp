from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ContextCreate(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    name: str = Field(min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: str | None = Field(default=None, max_length=50)


class ContextUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: str | None = Field(default=None, max_length=50)


class ContextResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    color: str | None
    icon: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class ContextBriefResponse(BaseModel):
    id: UUID
    name: str
    color: str | None
    icon: str | None

    model_config = {
        'from_attributes': True
    }


class ContextListResponse(BaseModel):
    items: list[ContextResponse]
    total: int
