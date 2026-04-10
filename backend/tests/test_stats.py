from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.task import Task
from app.models.user import User
from app.security import create_access_token


@pytest_asyncio.fixture
async def user_with_tasks(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        is_admin=False,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    tasks = [
        Task(
            user_id=user.id,
            title="Old completed task",
            is_completed=True,
            created_at=month_ago,
            updated_at=week_ago,
        ),
        Task(
            user_id=user.id,
            title="Recent completed task",
            is_completed=True,
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(days=1),
        ),
        Task(
            user_id=user.id,
            title="Old active task",
            is_completed=False,
            created_at=month_ago,
            updated_at=month_ago,
        ),
        Task(
            user_id=user.id,
            title="Recent active task",
            is_completed=False,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1),
        ),
        Task(
            user_id=user.id,
            title="Week old task",
            is_completed=False,
            created_at=week_ago,
            updated_at=week_ago,
        ),
    ]
    
    db_session.add_all(tasks)
    await db_session.commit()
    
    return user


@pytest_asyncio.fixture
async def auth_headers(user_with_tasks):
    access_token = create_access_token({"sub": user_with_tasks.id})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.mark.asyncio
async def test_get_stats_empty(client, db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        is_admin=False,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    
    access_token = create_access_token({"sub": user.id})
    
    response = await client.get(
        "/api/stats",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 0
    assert data["active"] == 0
    assert data["completed"] == 0
    assert data["created_week"] == 0
    assert data["created_month"] == 0
    assert data["completed_week"] == 0
    assert data["completed_month"] == 0


@pytest.mark.asyncio
async def test_get_stats_with_tasks(client, auth_headers):
    response = await client.get("/api/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 5
    assert data["active"] == 3
    assert data["completed"] == 2
    assert data["total"] == data["active"] + data["completed"]


@pytest.mark.asyncio
async def test_get_stats_requires_auth(client):
    response = await client.get("/api/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_stats_invalid_token(client):
    response = await client.get(
        "/api/stats",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_stats_only_user_tasks(client, auth_headers, db_session):
    result = await db_session.execute(select(User).where(User.username != "testuser"))
    other_user = result.scalar_one_or_none()
    
    if other_user:
        other_task = Task(
            user_id=other_user.id,
            title="Other user task",
            is_completed=True,
        )
        db_session.add(other_task)
        await db_session.commit()
    
    response = await client.get("/api/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_get_stats_all_fields_present(client, auth_headers):
    response = await client.get("/api/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    expected_fields = [
        "total",
        "active",
        "completed",
        "created_week",
        "created_month",
        "completed_week",
        "completed_month",
    ]
    
    for field in expected_fields:
        assert field in data
        assert isinstance(data[field], int)