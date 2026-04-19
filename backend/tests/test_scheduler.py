from datetime import UTC, datetime, time, timedelta
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio

from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User
from app.services.reminder_service import ReminderService


@pytest_asyncio.fixture
async def user_for_scheduler(db_session):
    user = User(
        username="sched_user",
        email="sched@example.com",
        password_hash="hash",
        timezone="Europe/Moscow",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_reminder_recovery_after_restart(db_session, user_for_scheduler):
    now = datetime.now(UTC)
    task = Task(
        user_id=user_for_scheduler.id,
        title="Missed task",
        due_date=now - timedelta(hours=1),
        reminder_time=time(datetime.now(UTC).hour - 1, 0),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()

    from app.scheduler import TaskScheduler

    with patch.object(TaskScheduler, '_job_send_due_reminders', create=True):
        pass

    reminder_service = ReminderService(db_session)
    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]
    assert len(matched) >= 1, "Recovery should find past-due reminders"

    for t, offset_minutes in matched:
        notification = await reminder_service.send_reminder(t, user_for_scheduler, offset_minutes)
        await db_session.commit()
        assert notification is not None
        assert notification.type == "due_reminder"


@pytest.mark.asyncio
async def test_scheduler_no_parallel_ticks():
    from app.scheduler import TaskScheduler

    scheduler = TaskScheduler()
    await scheduler.startup()

    job = scheduler.scheduler.get_job('send_due_reminders')
    assert job is not None
    assert job.max_instances == 1

    recovery_job = scheduler.scheduler.get_job('reminder_recovery')
    assert recovery_job is not None
    assert recovery_job.max_instances == 1

    await scheduler.shutdown()


@pytest.mark.asyncio
async def test_scheduler_tuple_unpacking(db_session, user_for_scheduler):
    now_utc = datetime.now(UTC)
    task = Task(
        user_id=user_for_scheduler.id,
        title="Tuple task",
        due_date=now_utc - timedelta(minutes=10),
        reminder_offsets=[5],
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    reminder_service = ReminderService(db_session)
    due_items = await reminder_service.find_due_tasks()
    matched = [(t, o) for t, o in due_items if t.id == task.id]

    assert len(matched) == 1
    found_task, offset = matched[0]
    assert offset == 5

    notification = await reminder_service.send_reminder(found_task, user_for_scheduler, offset)
    await db_session.commit()
    assert notification is not None

    await db_session.refresh(task)
    assert task.sent_reminder_offsets == [5]
