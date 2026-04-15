import pytest
import pytest_asyncio
from sqlalchemy import select

from app.event_bus import event_bus
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


@pytest.mark.asyncio
async def test_sse_notifications_requires_auth(client):
    response = await client.get("/api/sse/notifications")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sse_rate_limit_exceeded(auth_client, db_session):
    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()
    user_id = str(user.id)

    for _ in range(3):
        event_bus.subscribe(f"{user_id}:notifications")

    try:
        response = await auth_client.get("/api/sse/notifications")
        assert response.status_code == 429
        assert "Too many SSE connections" in response.json()["detail"]
    finally:
        event_bus.cleanup_user(user_id)


@pytest.mark.asyncio
async def test_sse_disconnect_cleans_up(auth_client, db_session):
    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()
    user_id = str(user.id)

    assert event_bus.get_subscriber_count(f"{user_id}:notifications") == 0

    queue = event_bus.subscribe(f"{user_id}:notifications")
    assert event_bus.get_subscriber_count(f"{user_id}:notifications") == 1

    event_bus.unsubscribe(f"{user_id}:notifications", queue)
    assert event_bus.get_subscriber_count(f"{user_id}:notifications") == 0
