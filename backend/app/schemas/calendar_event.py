from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.base import BaseResponseSchema


class CalendarEventSelectItem(BaseModel):
    id: UUID
    title: str
    start_time: datetime

    model_config = {'from_attributes': True}


class CalendarEventCreate(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    start_time: datetime
    end_time: datetime | None = None
    all_day: bool = False
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    location: str | None = Field(default=None, max_length=500)
    attendees: list[str] | None = Field(default=None)
    recurrence_type: str | None = Field(default=None)
    recurrence_config: dict | None = Field(default=None)
    recurrence_end_date: datetime | None = Field(default=None)

    @model_validator(mode='after')
    def validate_times(self) -> 'CalendarEventCreate':
        if self.end_time is not None and self.end_time < self.start_time:
            raise ValueError('end_time must be after start_time')
        return self

    @model_validator(mode='after')
    def validate_recurrence(self) -> 'CalendarEventCreate':
        if self.recurrence_type and not self.start_time:
            raise ValueError('start_time is required when recurrence_type is set')
        if self.recurrence_type and self.recurrence_config:
            from app.services.event_recurrence_service import EventRecurrenceService
            if not EventRecurrenceService.validate_recurrence_config(self.recurrence_type, self.recurrence_config):
                raise ValueError('Invalid recurrence_config for the given recurrence_type')
        return self


class CalendarEventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    start_time: datetime | None = None
    end_time: datetime | None = None
    all_day: bool | None = None
    color: str | None = Field(default=None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    location: str | None = Field(default=None, max_length=500)
    attendees: list[str] | None = Field(default=None)
    recurrence_type: str | None = Field(default=None)
    recurrence_config: dict | None = Field(default=None)
    recurrence_end_date: datetime | None = Field(default=None)

    @model_validator(mode='after')
    def validate_times(self) -> 'CalendarEventUpdate':
        if self.end_time is not None and self.start_time is not None and self.end_time < self.start_time:
            raise ValueError('end_time must be after start_time')
        return self

    @model_validator(mode='after')
    def validate_recurrence(self) -> 'CalendarEventUpdate':
        if self.recurrence_type and self.start_time is None:
            raise ValueError('start_time is required when recurrence_type is set')
        if self.recurrence_type and self.recurrence_config:
            from app.services.event_recurrence_service import EventRecurrenceService
            if not EventRecurrenceService.validate_recurrence_config(self.recurrence_type, self.recurrence_config):
                raise ValueError('Invalid recurrence_config for the given recurrence_type')
        return self


class CalendarEventResponse(BaseResponseSchema):
    id: UUID
    user_id: UUID
    title: str
    description: str | None
    start_time: datetime
    end_time: datetime | None
    all_day: bool
    color: str | None
    location: str | None
    attendees: list[str] | None
    recurrence_type: str | None
    recurrence_config: dict | None
    recurrence_end_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }


class CalendarEventListResponse(BaseModel):
    items: list[CalendarEventResponse]
    total: int


class EventRecurrenceResponse(BaseResponseSchema):
    id: UUID
    event_id: UUID
    generated_event_id: UUID
    start_time_of_generated_event: datetime
    generated_at: datetime
    status: str

    model_config = {'from_attributes': True}


class EventRecurrenceListResponse(BaseModel):
    items: list[EventRecurrenceResponse]
    total: int
