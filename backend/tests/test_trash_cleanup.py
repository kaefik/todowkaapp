from datetime import datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.task import GtdStatus, Task
from app.models.user import User
from app.services.task_service import TaskService


@pytest_asyncio.fixture
async def auth_user(client, db_session):
    user_data = {
        "username": "trashuser",
        "email": "trashuser@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login", json={"username": "trashuser", "password": "Password123!"}
    )
    token = login_response.json()["access_token"]
    result = await db_session.execute(select(User).where(User.username == "trashuser"))
    user = result.scalar_one()
    return {"user": user, "token": token}


@pytest.mark.asyncio
async def test_move_to_trash_sets_trashed_at(client, auth_user, db_session):
    response = await client.post(
        "/api/tasks",
        json={"title": "Task to trash"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 201
    task_id = response.json()["id"]

    move_response = await client.patch(
        f"/api/tasks/{task_id}/move",
        json={"gtd_status": "trash"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert move_response.status_code == 200
    data = move_response.json()
    assert data["gtd_status"] == "trash"

    result = await db_session.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one()
    assert task.trashed_at is not None
    assert task.gtd_status == GtdStatus.TRASH.value


@pytest.mark.asyncio
async def test_restore_from_trash_clears_trashed_at(client, auth_user, db_session):
    response = await client.post(
        "/api/tasks",
        json={"title": "Task to restore"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    task_id = response.json()["id"]

    await client.patch(
        f"/api/tasks/{task_id}/move",
        json={"gtd_status": "trash"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )

    restore_response = await client.patch(
        f"/api/tasks/{task_id}/move",
        json={"gtd_status": "inbox"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert restore_response.status_code == 200

    result = await db_session.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one()
    assert task.trashed_at is None
    assert task.gtd_status == GtdStatus.INBOX.value


@pytest.mark.asyncio
async def test_cleanup_old_trash_deletes_old_tasks(db_session, auth_user):
    task_service = TaskService(db_session)
    user_id = auth_user["user"].id

    old_task = Task(
        id=str(uuid4()),
        user_id=str(user_id),
        title="Old trash task",
        gtd_status=GtdStatus.TRASH.value,
        trashed_at=datetime.now() - timedelta(days=31),
    )
    recent_task = Task(
        id=str(uuid4()),
        user_id=str(user_id),
        title="Recent trash task",
        gtd_status=GtdStatus.TRASH.value,
        trashed_at=datetime.now() - timedelta(days=10),
    )
    db_session.add(old_task)
    db_session.add(recent_task)
    await db_session.flush()

    deleted = await task_service.cleanup_old_trash(days=30)
    await db_session.commit()

    assert deleted == 1

    remaining = (await db_session.execute(
        select(Task).where(Task.user_id == str(user_id), Task.gtd_status == GtdStatus.TRASH.value)
    )).scalars().all()
    assert len(remaining) == 1
    assert remaining[0].title == "Recent trash task"


@pytest.mark.asyncio
async def test_cleanup_old_trash_deletes_subtasks(db_session, auth_user):
    task_service = TaskService(db_session)
    user_id = auth_user["user"].id

    parent_id = str(uuid4())
    parent = Task(
        id=parent_id,
        user_id=str(user_id),
        title="Old parent in trash",
        gtd_status=GtdStatus.TRASH.value,
        trashed_at=datetime.now() - timedelta(days=35),
    )
    subtask = Task(
        id=str(uuid4()),
        user_id=str(user_id),
        title="Old subtask in trash",
        gtd_status=GtdStatus.TRASH.value,
        parent_task_id=parent_id,
        trashed_at=datetime.now() - timedelta(days=35),
    )
    db_session.add(parent)
    db_session.add(subtask)
    await db_session.flush()

    deleted = await task_service.cleanup_old_trash(days=30)
    await db_session.commit()

    assert deleted == 1

    remaining = (await db_session.execute(
        select(Task).where(Task.user_id == str(user_id))
    )).scalars().all()
    assert len(remaining) == 0


@pytest.mark.asyncio
async def test_cleanup_old_trash_skips_tasks_without_trashed_at(db_session, auth_user):
    task_service = TaskService(db_session)
    user_id = auth_user["user"].id

    task_without_trashed_at = Task(
        id=str(uuid4()),
        user_id=str(user_id),
        title="Trashed before trashed_at field",
        gtd_status=GtdStatus.TRASH.value,
        trashed_at=None,
    )
    db_session.add(task_without_trashed_at)
    await db_session.flush()

    deleted = await task_service.cleanup_old_trash(days=30)
    await db_session.commit()

    assert deleted == 0

    result = await db_session.execute(
        select(Task).where(Task.id == task_without_trashed_at.id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_cleanup_old_trash_boundary_30_days(db_session, auth_user):
    task_service = TaskService(db_session)
    user_id = auth_user["user"].id

    exactly_30 = Task(
        id=str(uuid4()),
        user_id=str(user_id),
        title="Exactly 30 days old",
        gtd_status=GtdStatus.TRASH.value,
        trashed_at=datetime.now() - timedelta(days=30) + timedelta(seconds=1),
    )
    just_over = Task(
        id=str(uuid4()),
        user_id=str(user_id),
        title="31 days old",
        gtd_status=GtdStatus.TRASH.value,
        trashed_at=datetime.now() - timedelta(days=31),
    )
    db_session.add(exactly_30)
    db_session.add(just_over)
    await db_session.flush()

    deleted = await task_service.cleanup_old_trash(days=30)
    await db_session.commit()

    assert deleted == 1

    remaining = (await db_session.execute(
        select(Task).where(Task.user_id == str(user_id), Task.gtd_status == GtdStatus.TRASH.value)
    )).scalars().all()
    assert len(remaining) == 1
    assert remaining[0].title == "Exactly 30 days old"
