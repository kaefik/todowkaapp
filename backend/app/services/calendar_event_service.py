import uuid as uuid_mod
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar_event import CalendarEvent
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventUpdate


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


class CalendarEventService:
    def __init__(self, db: Annotated[AsyncSession, 'Async database session']):
        self.db = db

    async def get_events(
        self,
        user_id: UUID,
        start_from: datetime | None = None,
        start_to: datetime | None = None,
        updated_since: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[CalendarEvent], int]:
        base_where = [CalendarEvent.user_id == user_id]
        if start_from is not None:
            base_where.append(CalendarEvent.start_time >= start_from)
        if start_to is not None:
            base_where.append(CalendarEvent.start_time <= start_to)
        if updated_since is not None:
            base_where.append(CalendarEvent.updated_at >= updated_since)

        count_result = await self.db.execute(
            select(func.count(CalendarEvent.id)).where(*base_where)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(CalendarEvent)
            .where(*base_where)
            .order_by(CalendarEvent.start_time.asc())
            .limit(limit)
            .offset(offset)
        )
        events = list(result.scalars().all())
        return events, total

    async def get_event(self, user_id: UUID, event_id: UUID) -> CalendarEvent | None:
        result = await self.db.execute(
            select(CalendarEvent).where(
                CalendarEvent.id == event_id,
                CalendarEvent.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_event(self, user_id: UUID, data: CalendarEventCreate) -> CalendarEvent:
        event = CalendarEvent(
            id=data.id if data.id else str(uuid_mod.uuid4()),
            user_id=str(user_id),
            title=data.title,
            description=data.description,
            start_time=_to_utc(data.start_time),
            end_time=_to_utc(data.end_time),
            all_day=data.all_day,
            color=data.color,
            location=data.location,
            attendees=data.attendees,
            recurrence_type=data.recurrence_type,
            recurrence_config=data.recurrence_config,
            recurrence_end_date=_to_utc(data.recurrence_end_date),
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def update_event(
        self, user_id: UUID, event_id: UUID, data: CalendarEventUpdate
    ) -> CalendarEvent | None:
        event = await self.get_event(user_id, event_id)
        if event is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if isinstance(value, datetime):
                value = _to_utc(value)
            setattr(event, field, value)

        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def delete_event(self, user_id: UUID, event_id: UUID) -> bool:
        event = await self.get_event(user_id, event_id)
        if event is None:
            return False
        await self.db.delete(event)
        await self.db.flush()
        return True

    async def get_events_for_select(self, user_id: UUID) -> list[CalendarEvent]:
        result = await self.db.execute(
            select(CalendarEvent)
            .where(CalendarEvent.user_id == user_id)
            .order_by(CalendarEvent.start_time.asc())
        )
        return list(result.scalars().all())

    async def stop_recurrence(self, user_id: UUID, event_id: UUID) -> CalendarEvent | None:
        event = await self.get_event(user_id, event_id)
        if event is None:
            return None

        event.recurrence_type = None
        event.recurrence_config = None
        event.recurrence_end_date = None

        await self.db.flush()
        await self.db.refresh(event)
        return event
