from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.calendar_event import CalendarEvent
from app.models.event_recurrence import EventRecurrence

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


def _to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


def _to_aware_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


class EventRecurrenceService:
    DEFAULT_EVENT_DURATION_HOURS = 1

    def __init__(self, db: 'AsyncSession'):
        self.db = db

    def is_event_passed(self, event: CalendarEvent) -> bool:
        if not event.start_time:
            return False

        now_aware = datetime.now(UTC)
        event_end = _to_aware_utc(event.end_time) if event.end_time else _to_aware_utc(event.start_time) + timedelta(hours=self.DEFAULT_EVENT_DURATION_HOURS)
        return now_aware >= event_end

    async def generate_next_event(self, event: CalendarEvent) -> CalendarEvent | None:
        if not event.is_recurring:
            return None

        now_aware = datetime.now(UTC)
        if event.recurrence_end_date:
            if now_aware >= _to_aware_utc(event.recurrence_end_date):
                return None

        next_start_time = self.calculate_next_start_time(event)
        if next_start_time is None:
            return None

        existing = await self._find_existing_generated_event(event.id, next_start_time)
        if existing:
            return None

        if event.recurrence_end_date:
            if _to_naive_utc(next_start_time) > _to_naive_utc(event.recurrence_end_date):
                return None

        next_aware = _to_aware_utc(next_start_time)

        new_end = None
        if event.end_time:
            original_duration = _to_aware_utc(event.end_time) - _to_aware_utc(event.start_time)
            new_end = next_aware + original_duration

        new_event = CalendarEvent(
            id=str(uuid4()),
            user_id=event.user_id,
            title=event.title,
            description=event.description,
            start_time=next_aware,
            end_time=new_end,
            all_day=event.all_day,
            color=event.color,
            location=event.location,
            attendees=event.attendees,
            recurrence_type=event.recurrence_type,
            recurrence_config=event.recurrence_config,
            recurrence_end_date=event.recurrence_end_date,
        )

        self.db.add(new_event)
        await self.db.flush()

        await self.create_event_recurrence(event, new_event, next_aware)

        return new_event

    async def _find_existing_generated_event(self, event_id: str, start_time: datetime) -> EventRecurrence | None:
        naive_start = _to_naive_utc(start_time)
        stmt = select(EventRecurrence).where(
            EventRecurrence.event_id == event_id,
            func.date(EventRecurrence.start_time_of_generated_event) == naive_start.date(),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    def calculate_next_start_time(self, event: CalendarEvent, base_time: datetime | None = None) -> datetime | None:
        if not event.start_time:
            return None

        if not event.recurrence_type or not event.recurrence_config:
            return None

        config = event.recurrence_config
        recurrence_type = event.recurrence_type

        if not isinstance(config, dict):
            return None

        source = base_time if base_time is not None else event.start_time
        base_date = _to_naive_utc(source)

        interval = config.get('interval', 1)

        if not isinstance(interval, int) or interval < 1:
            return None

        if recurrence_type == 'daily':
            return base_date + timedelta(days=interval)

        if recurrence_type == 'weekly':
            days = config.get('days')
            if days and isinstance(days, list) and len(days) > 0:
                target_days = sorted(d - 1 for d in days)
                current_weekday = base_date.weekday()

                for day in target_days:
                    if day > current_weekday:
                        delta = day - current_weekday
                        return base_date + timedelta(days=delta)

                first_day = target_days[0]
                delta = (7 - current_weekday) + first_day + (7 * (interval - 1))
                return base_date + timedelta(days=delta)
            else:
                return base_date + timedelta(weeks=interval)

        if recurrence_type == 'monthly':
            day_of_month = config.get('day_of_month')
            if day_of_month and isinstance(day_of_month, int):
                try:
                    month = base_date.month + interval
                    year = base_date.year + (month - 1) // 12
                    month = ((month - 1) % 12) + 1
                    target_month = base_date.replace(year=year, month=month, day=1)
                    max_day = (target_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                    target_day = min(day_of_month, max_day.day)
                    return target_month.replace(day=target_day)
                except ValueError:
                    pass
            else:
                week_of_month = config.get('week_of_month')
                day_of_week = config.get('day_of_week')
                if week_of_month and day_of_week:
                    try:
                        target_weekday = day_of_week - 1

                        next_month = base_date.replace(day=1) + timedelta(days=32 * interval)
                        next_month = next_month.replace(day=1)
                        first_day_of_month = next_month

                        days_until_first_target = (target_weekday - first_day_of_month.weekday()) % 7
                        first_occurrence = first_day_of_month + timedelta(days=days_until_first_target)

                        if week_of_month == 1:
                            return first_occurrence
                        elif week_of_month == 2:
                            return first_occurrence + timedelta(weeks=1)
                        elif week_of_month == 3:
                            return first_occurrence + timedelta(weeks=2)
                        elif week_of_month == 4 or week_of_month == -1:
                            last_occurrence = first_occurrence + timedelta(weeks=3)
                            if last_occurrence.month != first_day_of_month.month:
                                last_occurrence -= timedelta(weeks=1)
                            return last_occurrence
                    except (ValueError, TypeError):
                        pass
                return base_date + timedelta(days=32 * interval)

        if recurrence_type == 'yearly':
            month = config.get('month')
            day_of_year = config.get('day_of_month')
            target_year = base_date.year + interval

            if month is not None and isinstance(month, int) and 1 <= month <= 12:
                target_month = month
            else:
                target_month = base_date.month

            if day_of_year is not None and isinstance(day_of_year, int) and 1 <= day_of_year <= 31:
                target_day = day_of_year
            else:
                target_day = base_date.day

            try:
                target = base_date.replace(year=target_year, month=target_month, day=1)
                max_day = (target + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                return target.replace(day=min(target_day, max_day.day))
            except ValueError:
                return None

        return None

    def should_generate_event(self, event: CalendarEvent) -> bool:
        if not event.is_recurring:
            return False

        if not event.start_time:
            return False

        now_aware = datetime.now(UTC)
        if event.recurrence_end_date:
            if now_aware >= _to_aware_utc(event.recurrence_end_date):
                return False

        if not self.is_event_passed(event):
            return False

        next_start_time = self.calculate_next_start_time(event)
        if next_start_time is None:
            return False

        return True

    async def create_event_recurrence(
        self, original_event: CalendarEvent, generated_event: CalendarEvent, start_time: datetime
    ) -> EventRecurrence:
        recurrence = EventRecurrence(
            id=str(uuid4()),
            event_id=original_event.id,
            generated_event_id=generated_event.id,
            start_time_of_generated_event=start_time,
            status='completed'
        )
        self.db.add(recurrence)
        await self.db.flush()
        return recurrence

    async def get_recurrence_history(
        self, event_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[EventRecurrence], int]:
        count_stmt = select(func.count(EventRecurrence.id)).where(EventRecurrence.event_id == event_id)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(EventRecurrence)
            .options(selectinload(EventRecurrence.generated_event))
            .where(EventRecurrence.event_id == event_id)
            .order_by(EventRecurrence.generated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        recurrences = list(result.scalars().all())
        return recurrences, total

    async def generate_next_if_needed(self, event: CalendarEvent) -> CalendarEvent | None:
        if self.should_generate_event(event):
            return await self.generate_next_event(event)
        return None

    async def catch_up_missed_events(
        self, event: CalendarEvent, max_days: int = 7
    ) -> list[CalendarEvent]:
        if not event.recurrence_type:
            return []

        if not event.start_time:
            return []

        now_aware = datetime.now(UTC)
        if event.recurrence_end_date:
            if now_aware >= _to_aware_utc(event.recurrence_end_date):
                return []

        generated_events: list[CalendarEvent] = []
        now = datetime.now(UTC)
        max_date = now + timedelta(days=max_days)

        working_start = _to_aware_utc(event.start_time)
        original_duration = None
        if event.end_time:
            original_duration = _to_aware_utc(event.end_time) - _to_aware_utc(event.start_time)

        while _to_naive_utc(working_start) < _to_naive_utc(max_date):
            next_start_naive = self.calculate_next_start_time(event, base_time=working_start)
            if next_start_naive is None:
                break

            if next_start_naive > _to_naive_utc(max_date):
                break

            if event.recurrence_end_date:
                if next_start_naive > _to_naive_utc(event.recurrence_end_date):
                    break

            existing = await self._find_existing_generated_event(event.id, next_start_naive)
            if existing:
                working_start = next_start_naive.replace(tzinfo=UTC)
                continue

            next_aware = next_start_naive.replace(tzinfo=UTC)

            new_end = None
            if original_duration is not None:
                new_end = next_aware + original_duration

            new_event = CalendarEvent(
                id=str(uuid4()),
                user_id=event.user_id,
                title=event.title,
                description=event.description,
                start_time=next_aware,
                end_time=new_end,
                all_day=event.all_day,
                color=event.color,
                location=event.location,
                attendees=event.attendees,
                recurrence_type=event.recurrence_type,
                recurrence_config=event.recurrence_config,
                recurrence_end_date=event.recurrence_end_date,
            )

            self.db.add(new_event)
            await self.db.flush()

            await self.create_event_recurrence(event, new_event, next_aware)
            generated_events.append(new_event)

            working_start = next_aware

        return generated_events

    @staticmethod
    def validate_recurrence_config(recurrence_type: str, config: dict) -> bool:
        if not isinstance(config, dict):
            return False

        if recurrence_type not in ['daily', 'weekly', 'monthly', 'yearly', 'custom']:
            return False

        interval = config.get('interval', 1)
        if not isinstance(interval, int) or interval < 1:
            return False

        if recurrence_type == 'weekly':
            days = config.get('days')
            if days is not None:
                if not isinstance(days, list):
                    return False
                if not all(isinstance(d, int) and 1 <= d <= 7 for d in days):
                    return False
                if len(days) == 0:
                    return False

        if recurrence_type == 'monthly':
            day_of_month = config.get('day_of_month')
            week_of_month = config.get('week_of_month')
            day_of_week = config.get('day_of_week')

            if day_of_month is not None:
                if not isinstance(day_of_month, int) or day_of_month < 1 or day_of_month > 31:
                    return False
            elif week_of_month is not None and day_of_week is not None:
                if not isinstance(week_of_month, int) or week_of_month not in [1, 2, 3, 4, -1]:
                    return False
                if not isinstance(day_of_week, int) or day_of_week < 1 or day_of_week > 7:
                    return False
            else:
                return False

        if recurrence_type == 'yearly':
            month = config.get('month')
            day_of_month = config.get('day_of_month')
            if month is not None:
                if not isinstance(month, int) or month < 1 or month > 12:
                    return False
            if day_of_month is not None:
                if not isinstance(day_of_month, int) or day_of_month < 1 or day_of_month > 31:
                    return False

        return True
