from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.base import BaseResponseSchema


class BackupScheduleCreate(BaseModel):
    enabled: bool = True
    time: str = Field(pattern=r'^\d{2}:\d{2}$')
    period: Literal['daily', 'weekly', 'monthly'] = 'daily'
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    day_of_month: int | None = Field(default=None, ge=1, le=31)

    @field_validator('day_of_week')
    @classmethod
    def validate_day_of_week(cls, v: int | None, info) -> int | None:
        period = info.data.get('period', 'daily')
        if period == 'weekly' and v is None:
            v = 1
        if period != 'weekly' and v is not None:
            v = None
        return v

    @field_validator('day_of_month')
    @classmethod
    def validate_day_of_month(cls, v: int | None, info) -> int | None:
        period = info.data.get('period', 'daily')
        if period == 'monthly' and v is None:
            v = 1
        if period != 'monthly' and v is not None:
            v = None
        return v


class BackupScheduleUpdate(BaseModel):
    enabled: bool | None = None
    time: str | None = Field(default=None, pattern=r'^\d{2}:\d{2}$')
    period: Literal['daily', 'weekly', 'monthly'] | None = None
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    day_of_month: int | None = Field(default=None, ge=1, le=31)


class BackupScheduleResponse(BaseResponseSchema):
    id: str
    user_id: str
    enabled: bool
    time: str
    period: str
    day_of_week: int | None
    day_of_month: int | None
    last_sent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}
