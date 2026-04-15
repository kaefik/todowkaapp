from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.notification import Notification
from app.models.user import User


@pytest_asyncio.fixture
async def auth_client(client):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "Password123!",
        },
    )
    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "Password123!"},
    )
    token = response.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    yield client


@pytest_asyncio.fixture
async def auth_client2(client):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser2",
            "email": "test2@example.com",
            "password": "Password123!",
        },
    )
    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser2", "password": "Password123!"},
    )
    token = response.json()["access_token"]
    client2 = type(client)()
    client2.headers.update({"Authorization": f"Bearer {token}"})
    client2.base_url = client.base_url
    client2._transport = client._transport
    yield client2


@pytest_asyncio.fixture
async def create_notification(db_session, auth_client):
    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()

    notification = Notification(
        id=str(uuid4()),
        user_id=user.id,
        type="test",
        message="Test notification",
        is_read=False,
        created_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(notification)
    await db_session.commit()
    return notification


@pytest.mark.asyncio
async def test_list_notifications_empty(auth_client, db_session):
    response = await auth_client.get("/api/notifications")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["unread_count"] == 0


@pytest.mark.asyncio
async def test_list_notifications_with_data(auth_client, db_session, create_notification):
    response = await auth_client.get("/api/notifications")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["unread_count"] == 1
    assert data["items"][0]["type"] == "test"
    assert data["items"][0]["message"] == "Test notification"


@pytest.mark.asyncio
async def test_list_notifications_unread_only(auth_client, db_session, create_notification):
    response = await auth_client.get("/api/notifications?unread_only=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["unread_count"] == 1

    await auth_client.patch(f"/api/notifications/{create_notification.id}/read")

    response = await auth_client.get("/api/notifications?unread_only=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 0


@pytest.mark.asyncio
async def test_list_notifications_pagination(auth_client, db_session):
    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()

    for i in range(15):
        notification = Notification(
            id=str(uuid4()),
            user_id=user.id,
            type="test",
            message=f"Test notification {i}",
            is_read=i % 2 == 0,
            created_at=datetime.now(UTC) - timedelta(minutes=i),
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db_session.add(notification)
    await db_session.commit()

    response = await auth_client.get("/api/notifications?limit=5&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5
    assert data["total"] == 15

    response = await auth_client.get("/api/notifications?limit=5&offset=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5


@pytest.mark.asyncio
async def test_mark_notification_as_read(auth_client, db_session, create_notification):
    response = await auth_client.patch(f"/api/notifications/{create_notification.id}/read")
    assert response.status_code == 200
    assert response.json() == {"status": "marked_as_read"}

    await db_session.refresh(create_notification)
    assert create_notification.is_read is True
    assert create_notification.read_at is not None


@pytest.mark.asyncio
async def test_mark_notification_as_read_not_found(auth_client, db_session):
    fake_id = uuid4()
    response = await auth_client.patch(f"/api/notifications/{fake_id}/read")
    assert response.status_code == 404
    assert "Notification not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_mark_notification_as_read_wrong_user(auth_client, auth_client2, db_session, create_notification):
    response = await auth_client2.patch(f"/api/notifications/{create_notification.id}/read")
    assert response.status_code == 404
    assert "Notification not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_mark_all_as_read(auth_client, db_session):
    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()

    for i in range(5):
        notification = Notification(
            id=str(uuid4()),
            user_id=user.id,
            type="test",
            message=f"Test notification {i}",
            is_read=False,
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db_session.add(notification)
    await db_session.commit()

    response = await auth_client.get("/api/notifications")
    assert response.json()["unread_count"] == 5

    response = await auth_client.patch("/api/notifications/read-all")
    assert response.status_code == 200
    assert response.json() == {"status": "all_marked_as_read"}

    response = await auth_client.get("/api/notifications")
    assert response.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_delete_notification(auth_client, db_session, create_notification):
    response = await auth_client.delete(f"/api/notifications/{create_notification.id}")
    assert response.status_code == 204

    result = await db_session.execute(
        select(Notification).where(Notification.id == create_notification.id)
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_notification_not_found(auth_client, db_session):
    fake_id = uuid4()
    response = await auth_client.delete(f"/api/notifications/{fake_id}")
    assert response.status_code == 404
    assert "Notification not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_notification_wrong_user(auth_client, auth_client2, db_session, create_notification):
    response = await auth_client2.delete(f"/api/notifications/{create_notification.id}")
    assert response.status_code == 404
    assert "Notification not found" in response.json()["detail"]
