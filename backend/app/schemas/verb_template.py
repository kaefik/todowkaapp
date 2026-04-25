from datetime import datetime

from pydantic import BaseModel, Field


class VerbTemplateCreate(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    text: str = Field(min_length=1, max_length=30)
    icon: str = Field(min_length=1, max_length=10)


class VerbTemplateUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=30)
    icon: str | None = Field(default=None, min_length=1, max_length=10)


class VerbTemplateResponse(BaseModel):
    id: str
    user_id: str
    text: str
    icon: str
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class VerbTemplateListResponse(BaseModel):
    items: list[VerbTemplateResponse]
    total: int


class VerbTemplateReorderRequest(BaseModel):
    ids: list[str] = Field(min_length=1)
