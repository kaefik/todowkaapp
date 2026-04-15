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
async def test_find_due_tasks_with_reminder_time(reminder_service, db_session, user_with_timezone):
    now = datetime.now(ZoneInfo('Europe/Moscow'))
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=now + timedelta(hours=2),
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_tasks = await reminder_service.find_due_tasks()
    assert len(due_tasks) >= 1
    assert any(t.id == task.id for t in due_tasks)


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

    due_tasks = await reminder_service.find_due_tasks()
    assert len(due_tasks) >= 1


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

    due_tasks = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t in due_tasks)


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

    due_tasks = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t in due_tasks)


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
async def test_should_send_reminder_first_time(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    assert reminder_service.should_send_reminder(task) is True


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

    due_tasks = await reminder_service.find_due_tasks()
    assert any(t.id == task.id for t in due_tasks), "Past reminder without last_sent should trigger"


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

    due_tasks = await reminder_service.find_due_tasks()
    assert any(t.id == task.id for t in due_tasks), "Past reminder after last_sent should trigger if reminder time > last_sent"


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

    due_tasks = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t in due_tasks), "Past reminder before last_sent should not trigger"


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

    due_tasks = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t in due_tasks), "Future reminder should not trigger yet"


@pytest.mark.asyncio
async def test_should_send_reminder_within_24h(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_time=time(9, 0),
        last_reminder_sent_at=datetime.now(UTC) - timedelta(hours=12),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    assert reminder_service.should_send_reminder(task) is False


@pytest.mark.asyncio
async def test_should_send_reminder_after_24h(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Test task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_time=time(9, 0),
        last_reminder_sent_at=datetime.now(UTC) - timedelta(hours=25),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    assert reminder_service.should_send_reminder(task) is True


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

    due_tasks = await reminder_service.find_due_tasks()
    assert not any(t.id == task.id for t in due_tasks)


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

    due_tasks = await reminder_service.find_due_tasks()

    found = any(t.id == task.id for t in due_tasks)
    assert found, "Task should be found with reminder adjusted to due time"


@pytest.mark.asyncio
async def test_find_due_tasks_reminder_within_24h(reminder_service, db_session, user_with_timezone):
    task = Task(
        user_id=user_with_timezone.id,
        title="Task with recent reminder time",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_time=time(9, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    due_tasks = await reminder_service.find_due_tasks()
    assert len(due_tasks) >= 1
