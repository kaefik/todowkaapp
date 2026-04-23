from datetime import UTC, datetime, time, timedelta

import pytest
import pytest_asyncio

from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskUpdate
from app.services.task_service import TaskService


@pytest_asyncio.fixture
async def user_for_dedup(db_session):
    user = User(
        username="dedup_user",
        email="dedup@example.com",
        password_hash="hash",
        timezone="UTC",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def task_with_dedup(db_session, user_for_dedup):
    task = Task(
        user_id=user_for_dedup.id,
        title="Dedup task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        reminder_offsets=[5, 60],
        sent_reminder_offsets=[5, 60],
        last_reminder_sent_at=datetime.now(UTC),
        reminder_fired=True,
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


@pytest.mark.asyncio
async def test_update_task_resets_dedup_fields(db_session, user_for_dedup, task_with_dedup):
    task_service = TaskService(db_session)

    assert task_with_dedup.sent_reminder_offsets == [5, 60]
    assert task_with_dedup.last_reminder_sent_at is not None
    assert task_with_dedup.reminder_fired is True

    await task_service.update_task(
        user_for_dedup.id,
        task_with_dedup.id,
        TaskUpdate(reminder_time=time(10, 0)),
    )
    await db_session.commit()
    await db_session.refresh(task_with_dedup)

    assert task_with_dedup.reminder_fired is False
    assert task_with_dedup.sent_reminder_offsets == []
    assert task_with_dedup.last_reminder_sent_at is None


@pytest.mark.asyncio
async def test_sent_reminder_offsets_migration(db_session, user_for_dedup):
    task = Task(
        user_id=user_for_dedup.id,
        title="Migration test task",
        due_date=datetime.now(UTC) + timedelta(hours=1),
        is_completed=False,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    assert hasattr(task, 'sent_reminder_offsets')
    assert task.sent_reminder_offsets is None or task.sent_reminder_offsets == []
