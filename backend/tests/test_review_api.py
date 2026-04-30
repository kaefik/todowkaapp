
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.api.review import review_router
from app.main import create_app
from app.models.user import User


@pytest_asyncio.fixture
async def auth_client(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "reviewtestuser",
            "email": "reviewtest@example.com",
            "password": "Password123!",
        },
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "reviewtestuser", "password": "Password123!"},
    )
    access_token = login_resp.cookies.get("access_token")
    return {
        "access_token": access_token,
        "client": client,
    }


@pytest_asyncio.fixture
async def auth_user(db_session, auth_client):
    result = await db_session.execute(select(User).where(User.username == "reviewtestuser"))
    return result.scalar_one()

_review_router_included = False


@pytest_asyncio.fixture
async def review_client(db_session):
    global _review_router_included
    app = create_app()
    if not _review_router_included:
        from app.api.router import api_router as _ar
        _ar.include_router(review_router)
        _review_router_included = True

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def review_auth(review_client, db_session):
    await review_client.post(
        "/api/auth/register",
        json={
            "username": "reviewapiuser",
            "email": "reviewapi@example.com",
            "password": "Password123!",
        },
    )
    login_resp = await review_client.post(
        "/api/auth/login",
        json={"username": "reviewapiuser", "password": "Password123!"},
    )
    access_token = login_resp.cookies.get("access_token")
    result = await db_session.execute(select(User).where(User.username == "reviewapiuser"))
    user = result.scalar_one()
    return {
        "access_token": access_token,
        "user": user,
        "client": review_client,
    }


@pytest.mark.asyncio
async def test_get_review_status(review_auth):
    ac = review_auth["client"]
    token = review_auth["access_token"]

    response = await ac.get(
        "/api/review/status",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "inbox_count" in data
    assert "inbox_tasks" in data
    assert "active_projects" in data
    assert "someday_tasks" in data
    assert "review_count" in data


@pytest.mark.asyncio
async def test_complete_review(review_auth, db_session):
    ac = review_auth["client"]
    token = review_auth["access_token"]
    user = review_auth["user"]

    response = await ac.post(
        "/api/review/complete",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["review_count"] == 1
    assert data["completed_at"] is not None

    await db_session.refresh(user)
    assert user.review_count == 1
    assert user.last_review_at is not None
