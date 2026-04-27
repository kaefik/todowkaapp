from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import BaseResponseSchema


class AreaCreate(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')


class AreaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')


class AreaResponse(BaseResponseSchema):
    id: UUID
    user_id: UUID
    name: str
    description: str | None
    color: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class AreaListResponse(BaseModel):
    items: list[AreaResponse]
    total: int
