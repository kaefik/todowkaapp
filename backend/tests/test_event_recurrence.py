from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base
from app.models.calendar_event import CalendarEvent
from app.services.event_recurrence_service import (
    EventRecurrenceService,
    _to_aware_utc,
    _to_naive_utc,
)


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


def _make_event(
    start_time: datetime,
    end_time: datetime | None = None,
    recurrence_type: str | None = "daily",
    recurrence_config: dict | None = None,
    recurrence_end_date: datetime | None = None,
    user_id: str = "test-user",
) -> CalendarEvent:
    return CalendarEvent(
        id="test-event-1",
        user_id=user_id,
        title="Test Event",
        description=None,
        start_time=start_time,
        end_time=end_time or start_time + timedelta(hours=1),
        all_day=False,
        color=None,
        location="Test Location",
        attendees=["user1@example.com"],
        recurrence_type=recurrence_type,
        recurrence_config=recurrence_config or {"interval": 1},
        recurrence_end_date=recurrence_end_date,
    )


class TestTimezoneAwareRecurrence:
    def test_daily_recurrence_preserves_time_with_aware_utc(self):
        start = datetime(2026, 5, 11, 18, 3, 0, tzinfo=UTC)
        event = _make_event(start, start + timedelta(minutes=1))
        service = EventRecurrenceService.__new__(EventRecurrenceService)
        service.db = None

        next_start = service.calculate_next_start_time(event)

        assert next_start is not None
        assert next_start.hour == 18
        assert next_start.minute == 3

    def test_weekly_recurrence_preserves_time(self):
        start = datetime(2026, 5, 11, 18, 3, 0, tzinfo=UTC)
        event = _make_event(
            start,
            start + timedelta(hours=1),
            recurrence_type="weekly",
            recurrence_config={"interval": 1, "days": [2]},
        )
        service = EventRecurrenceService.__new__(EventRecurrenceService)
        service.db = None

        next_start = service.calculate_next_start_time(event)

        assert next_start is not None
        assert next_start.hour == 18
        assert next_start.minute == 3
        assert next_start.day == 12

    def test_monthly_recurrence_preserves_time(self):
        start = datetime(2026, 5, 11, 18, 3, 0, tzinfo=UTC)
        event = _make_event(
            start,
            start + timedelta(hours=1),
            recurrence_type="monthly",
            recurrence_config={"interval": 1, "day_of_month": 11},
        )
        service = EventRecurrenceService.__new__(EventRecurrenceService)
        service.db = None

        next_start = service.calculate_next_start_time(event)

        assert next_start is not None
        assert next_start.hour == 18
        assert next_start.minute == 3
        assert next_start.month == 6
        assert next_start.day == 11


class TestCatchUpMissedEvents:
    @pytest.mark.asyncio
    async def test_catch_up_uses_aware_utc_for_max_date(self, session):
        start = datetime(2026, 5, 11, 18, 3, 0, tzinfo=UTC)
        end = start + timedelta(minutes=1)
        event = _make_event(
            start,
            end,
            recurrence_type="daily",
            recurrence_config={"interval": 1},
        )
        service = EventRecurrenceService(session)

        result = await service.catch_up_missed_events(event, max_days=7)

        now_aware = datetime.now(UTC)
        for ev in result:
            assert _to_aware_utc(ev.start_time) <= now_aware + timedelta(days=7)


class TestIsEventPassed:
    def test_past_event_is_detected(self):
        start = datetime(2020, 1, 1, 10, 0, 0, tzinfo=UTC)
        end = start + timedelta(hours=1)
        event = _make_event(start, end)

        service = EventRecurrenceService.__new__(EventRecurrenceService)
        service.db = None

        assert service.is_event_passed(event) is True

    def test_future_event_is_not_passed(self):
        start = datetime(2099, 1, 1, 10, 0, 0, tzinfo=UTC)
        end = start + timedelta(hours=1)
        event = _make_event(start, end)

        service = EventRecurrenceService.__new__(EventRecurrenceService)
        service.db = None

        assert service.is_event_passed(event) is False


class TestPydanticParsing:
    def test_aware_datetime_parsing(self):
        from app.schemas.calendar_event import CalendarEventCreate

        data = CalendarEventCreate(
            title="Test",
            start_time="2026-05-11T21:03:00+03:00",
            end_time="2026-05-11T21:04:00+03:00",
        )

        assert data.start_time.tzinfo is not None
        utc_hour = data.start_time.utctimetuple().tm_hour
        assert utc_hour == 18
        assert data.start_time.minute == 3


class TestToNaiveToAwareConversion:
    def test_aware_to_naive_utc(self):
        from datetime import timedelta, timezone

        aware = datetime(2026, 5, 11, 21, 3, 0, tzinfo=timezone(timedelta(hours=3)))
        naive = _to_naive_utc(aware)

        assert naive.tzinfo is None
        assert naive.hour == 18
        assert naive.minute == 3

    def test_naive_to_aware_utc(self):
        naive = datetime(2026, 5, 12, 18, 3, 0)
        aware = _to_aware_utc(naive)

        assert aware.tzinfo is not None
        assert aware.hour == 18
        assert aware.minute == 3


class TestCalendarEventServiceToUtc:
    def test_to_utc_converts_aware_to_naive_utc(self):
        from datetime import timezone as tz

        from app.services.calendar_event_service import _to_utc

        aware = datetime(2026, 5, 11, 21, 3, 0, tzinfo=tz(timedelta(hours=3)))
        result = _to_utc(aware)

        assert result is not None
        assert result.tzinfo is None
        assert result.hour == 18
        assert result.minute == 3

    def test_to_utc_passes_naive_through(self):
        from app.services.calendar_event_service import _to_utc

        naive = datetime(2026, 5, 11, 18, 3, 0)
        result = _to_utc(naive)

        assert result is not None
        assert result.tzinfo is None
        assert result.hour == 18
        assert result.minute == 3

    def test_to_utc_returns_none_for_none(self):
        from app.services.calendar_event_service import _to_utc

        assert _to_utc(None) is None

    def test_to_utc_handles_utc_aware(self):
        from app.services.calendar_event_service import _to_utc

        aware = datetime(2026, 5, 11, 18, 3, 0, tzinfo=UTC)
        result = _to_utc(aware)

        assert result is not None
        assert result.tzinfo is None
        assert result.hour == 18
        assert result.minute == 3

    def test_full_flow_frontend_to_db_to_next_event(self):
        start = datetime(2026, 5, 11, 18, 3, 0)
        event = _make_event(start, start + timedelta(minutes=1))

        service = EventRecurrenceService.__new__(EventRecurrenceService)
        service.db = None

        next_start = service.calculate_next_start_time(event)

        assert next_start is not None
        assert next_start.hour == 18
        assert next_start.minute == 3
        assert next_start.day == 12
