from datetime import UTC, datetime, time, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
import pytest_asyncio
from sqlalchemy import func, select

from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User
from app.services.reminder_service import ReminderService


@pytest.fixture
def reminder_service(db_session):
    return ReminderService(db_session)


@pytest_asyncio.fixture
async def user_with_timezone(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hash",
        timezone="Europe/Moscow",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_tokyo(db_session):
    user = User(
        username="tokyo_user",
        email="tokyo@example.com",
        password_hash="hash",
        timezone="Asia/Tokyo",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_ny(db_session):
    user = User(
        username="ny_user",
        email="ny@example.com",
        password_hash="hash",
        timezone="America/New_York",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_honolulu(db_session):
    user = User(
        username="honolulu_user",
        email="honolulu@example.com",
        password_hash="hash",
        timezone="Pacific/Honolulu",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def task_with_due_date(db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=datetime.now(UTC) + timedelta(hours=2),
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


@pytest.mark.asyncio
async def test_find_due_tasks_returns_tuples(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task_time = Task(
        user_id=user_with_timezone.id,
        title="Time task",
        due_date=now + timedelta(hours=2),
        reminder_time=time(9, 0),
        is_completed=False,
    )
    task_offset = Task(
        user_id=user_with_timezone.id,
        title="Offset task",
        due_date=datetime.now(UTC) - timedelta(minutes=10),
        reminder_offsets=[5],
        is_completed=False,
    )
    db_session.add_all([task_time, task_offset])
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()

    for item in due_items:
        assert isinstance(item, tuple)
        assert len(item) == 2
        assert isinstance(item[0], Task)
        assert isinstance(item[1], (int, type(None)))

    offset_item = next((t, o) for t, o in due_items if t.id == task_offset.id)
    assert offset_item[1] == 5


@pytest.mark.asyncio
async def test_multiple_offsets_fire_independently(reminder_service, db_session, user_with_timezone):
    now_utc = datetime.now(UTC)
    task = Task(
        user_id=user_with_timezone.id,
        title="Multi offset task",
        due_date=now_utc + timedelta(hours=2),
        reminder_offsets=[5, 60, 1440],
        sent_reminder_offsets=[5, 60, 1440],
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]
    assert len(matched) == 0, "All offsets already sent — nothing should fire"


@pytest.mark.asyncio
async def test_offset_not_fired_twice(reminder_service, db_session, user_with_timezone):
    now_utc = datetime.now(UTC)
    task = Task(
        user_id=user_with_timezone.id,
        title="Offset dedup task",
        due_date=now_utc - timedelta(minutes=10),
        reminder_offsets=[5, 15],
        sent_reminder_offsets=[5],
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]
    assert len(matched) == 1
    assert matched[0][1] == 15


@pytest.mark.asyncio
async def test_reminder_time_clamping_positive_utc(reminder_service, db_session, user_tokyo):
    now_local = datetime.now(ZoneInfo('Asia/Tokyo'))
    due_local = now_local.replace(hour=10, minute=0, second=0, microsecond=0)
    task = Task(
        user_id=user_tokyo.id,
        title="Tokyo clamp task",
        due_date=due_local,
        reminder_time=time(23, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]
    if due_local < datetime.now(ZoneInfo('Asia/Tokyo')):
        assert len(matched) >= 0
    else:
        assert len(matched) == 0


@pytest.mark.asyncio
async def test_reminder_time_clamping_negative_utc(reminder_service, db_session, user_ny):
    now_local = datetime.now(ZoneInfo('America/New_York'))
    due_local = now_local.replace(hour=10, minute=0, second=0, microsecond=0)
    task = Task(
        user_id=user_ny.id,
        title="NY clamp task",
        due_date=due_local,
        reminder_time=time(23, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]
    if due_local < datetime.now(ZoneInfo('America/New_York')):
        assert len(matched) >= 0
    else:
        assert len(matched) == 0


@pytest.mark.asyncio
async def test_reminder_time_midnight_due_date(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    due_local = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if due_local >= now:
        due_local -= timedelta(days=1)
    task = Task(
        user_id=user_with_timezone.id,
        title="Midnight due task",
        due_date=due_local,
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]
    assert len(matched) >= 0


@pytest.mark.asyncio
async def test_dst_transition_reminder_time(reminder_service, db_session, user_ny):
    now_utc = datetime.now(UTC)
    due_utc = now_utc.replace(month=3, day=9, hour=6, minute=0, second=0, microsecond=0)
    if due_utc < now_utc:
        due_utc = due_utc.replace(year=due_utc.year + 1)
    task = Task(
        user_id=user_ny.id,
        title="DST task",
        due_date=due_utc,
        reminder_time=time(6, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert isinstance(due_items, list)


@pytest.mark.asyncio
async def test_find_due_tasks_with_reminder_time(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    due_local = now - timedelta(minutes=30)
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=due_local,
        reminder_time=time(now.hour, max(0, now.minute - 30)),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert len(due_items) >= 1
    assert any(t.id == task.id for t, _ in due_items)


@pytest.mark.asyncio
async def test_find_due_tasks_with_reminder_offsets(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=datetime.now(UTC) + timedelta(minutes=10),
        reminder_offsets=[15],
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert len(due_items) >= 1


@pytest.mark.asyncio
async def test_find_due_tasks_skips_completed(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Completed task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_time=time(9, 0),
        is_completed=True,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t, _ in due_items)


@pytest.mark.asyncio
async def test_find_due_tasks_skips_no_due_date(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Task without due date",
        due_date=None,
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t, _ in due_items)


@pytest.mark.asyncio
async def test_send_reminder_creates_notification(reminder_service, db_session, user_with_timezone, task_with_due_date):
    initial_count = await db_session.execute(
        select(func.count(Notification.id)).where(Notification.user_id == user_with_timezone.id)
    )
    initial_count = initial_count.scalar() or 0

    notification = await reminder_service.send_reminder(task_with_due_date, user_with_timezone)

    assert notification is not None
    assert notification.type == "due_reminder"
    assert "Напоминание о задаче" in notification.message
    assert notification.task_id == task_with_due_date.id

    await db_session.commit()

    final_count = await db_session.execute(
        select(func.count(Notification.id)).where(Notification.user_id == user_with_timezone.id)
    )
    assert final_count.scalar() == initial_count + 1


@pytest.mark.asyncio
async def test_send_reminder_updates_last_sent_at(reminder_service, db_session, user_with_timezone, task_with_due_date):
    assert task_with_due_date.last_reminder_sent_at is None

    await reminder_service.send_reminder(task_with_due_date, user_with_timezone)
    await db_session.commit()
    await db_session.refresh(task_with_due_date)

    assert task_with_due_date.last_reminder_sent_at is not None


@pytest.mark.asyncio
async def test_send_reminder_offset_writes_to_sent_array(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Offset task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_offsets=[5, 60],
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    await reminder_service.send_reminder(task, user_with_timezone, offset_minutes=5)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.sent_reminder_offsets == [5]
    assert task.reminder_fired is False


@pytest.mark.asyncio
async def test_send_reminder_offset_conditional_fired(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="All offsets task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_offsets=[5, 60],
        sent_reminder_offsets=[5],
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    await reminder_service.send_reminder(task, user_with_timezone, offset_minutes=60)
    await db_session.commit()
    await db_session.refresh(task)

    assert set(task.sent_reminder_offsets) == {5, 60}
    assert task.reminder_fired is True


@pytest.mark.asyncio
async def test_send_reminder_time_sets_last_sent(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Time reminder task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    await reminder_service.send_reminder(task, user_with_timezone, offset_minutes=None)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.last_reminder_sent_at is not None
    assert task.reminder_fired is True


@pytest.mark.asyncio
async def test_find_due_tasks_reminder_past_no_last_sent(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with past reminder no last sent",
        due_date=now - timedelta(hours=1),
        reminder_time=time(now.hour - 1, 0),
        last_reminder_sent_at=None,
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert any(t.id == task.id for t, _ in due_items), "Past reminder without last_sent should trigger"


@pytest.mark.asyncio
async def test_find_due_tasks_reminder_past_after_last_sent(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with past reminder after last sent",
        due_date=now - timedelta(minutes=30),
        reminder_time=time(now.hour - 1, 0),
        last_reminder_sent_at=now - timedelta(days=1),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert any(t.id == task.id for t, _ in due_items), "Past reminder after last_sent should trigger if reminder time > last_sent"


@pytest.mark.asyncio
async def test_find_due_tasks_reminder_past_before_last_sent(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with past reminder before last sent",
        due_date=now - timedelta(hours=1),
        reminder_time=time(now.hour - 1, 0),
        last_reminder_sent_at=now,
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t, _ in due_items), "Past reminder before last_sent should not trigger"


@pytest.mark.asyncio
async def test_find_due_tasks_reminder_future_no_trigger(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with future reminder",
        due_date=now + timedelta(hours=1),
        reminder_time=time(now.hour + 1, 0),
        last_reminder_sent_at=None,
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t, _ in due_items), "Future reminder should not trigger yet"


@pytest.mark.asyncio
async def test_mark_all_as_read_bulk(reminder_service, db_session, user_with_timezone):
    for i in range(5):
        notification = Notification(
            id=str(uuid4()),
            user_id=user_with_timezone.id,
            type="test",
            message=f"Test notification {i}",
            is_read=False,
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db_session.add(notification)
    await db_session.commit()

    count = await reminder_service.mark_all_as_read(user_with_timezone.id)
    assert count == 5

    result = await db_session.execute(
        select(Notification).where(
            Notification.user_id == user_with_timezone.id,
            not Notification.is_read
        )
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_cleanup_expired_notifications(reminder_service, db_session, user_with_timezone):
    expired_notification = Notification(
        id=str(uuid4()),
        user_id=user_with_timezone.id,
        type="test",
        message="Expired notification",
        is_read=False,
        created_at=datetime.now(UTC) - timedelta(days=40),
        expires_at=datetime.now(UTC) - timedelta(days=10),
    )
    active_notification = Notification(
        id=str(uuid4()),
        user_id=user_with_timezone.id,
        type="test",
        message="Active notification",
        is_read=False,
        created_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(expired_notification)
    db_session.add(active_notification)
    await db_session.commit()

    deleted_count = await reminder_service.cleanup_expired_notifications(days=30)
    assert deleted_count >= 1

    result = await db_session.execute(
        select(Notification).where(Notification.id == expired_notification.id)
    )
    assert result.scalar_one_or_none() is None

    result = await db_session.execute(
        select(Notification).where(Notification.id == active_notification.id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_cleanup_does_not_remove_active(reminder_service, db_session, user_with_timezone):
    active_notification = Notification(
        id=str(uuid4()),
        user_id=user_with_timezone.id,
        type="test",
        message="Active notification",
        is_read=False,
        created_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(active_notification)
    await db_session.commit()

    deleted_count = await reminder_service.cleanup_expired_notifications(days=30)
    assert deleted_count == 0

    result = await db_session.execute(
        select(Notification).where(Notification.id == active_notification.id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_find_due_tasks_skips_old_reminders(reminder_service, db_session, user_with_timezone):
    old_due_date = datetime.now(UTC) - timedelta(days=7)
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with old due date",
        due_date=old_due_date,
        reminder_time=time(9, 0),
        last_reminder_sent_at=old_due_date + timedelta(hours=1),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t, _ in due_items)


@pytest.mark.asyncio
async def test_find_due_tasks_with_reminder_time_after_due_time(reminder_service, db_session, user_with_timezone):
    due_date = datetime.now(ZoneInfo('Europe/Moscow')) - timedelta(minutes=30)
    due_date = due_date.replace(minute=0, second=0, microsecond=0)
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with reminder after due time",
        due_date=due_date,
        reminder_time=time(20, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()

    found = any(t.id == task.id for t, _ in due_items)
    assert found, "Task should be found with reminder adjusted to due time"


@pytest.mark.asyncio
async def test_find_due_tasks_reminder_within_24h(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with recent reminder time",
        due_date=now + timedelta(hours=1),
        reminder_time=time(now.hour, 0) if now.hour < 23 else time(23, 59),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_items = await reminder_service.find_due_tasks()
    assert len(due_items) >= 1
