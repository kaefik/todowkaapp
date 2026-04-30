import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.session import Session
from app.models.user import User
from app.security import decode_token


@pytest_asyncio.fixture
async def auth_client(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "sessiontestuser",
            "email": "sessiontest@example.com",
            "password": "Password123!",
        },
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "sessiontestuser", "password": "Password123!"},
    )
    access_token = login_resp.cookies.get("access_token")
    refresh_token = login_resp.cookies.get("refresh_token")
    result = await db_session.execute(select(User).where(User.username == "sessiontestuser"))
    user = result.scalar_one()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "client": client,
    }


@pytest.mark.asyncio
async def test_get_sessions(auth_client):
    ac = auth_client["client"]
    token = auth_client["access_token"]

    response = await ac.get(
        "/api/sessions",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_sessions_without_auth(client):
    response = await client.get("/api/sessions")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_revoke_session(auth_client, db_session):
    ac = auth_client["client"]
    token = auth_client["access_token"]
    user = auth_client["user"]

    from app.services.session_service import SessionService

    svc = SessionService(db_session)
    s = await svc.create_session(
        user_id=user.id,
        refresh_jti="revoke-test-jti",
        user_agent_raw=None,
        ip_address=None,
    )
    await db_session.commit()

    response = await ac.delete(
        f"/api/sessions/{s.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True

    result = await db_session.execute(select(Session).where(Session.id == s.id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_revoke_all_sessions(auth_client, db_session):
    ac = auth_client["client"]
    token = auth_client["access_token"]
    refresh_token = auth_client["refresh_token"]
    user = auth_client["user"]

    payload = decode_token(refresh_token)
    current_jti = payload["jti"]

    from app.services.session_service import SessionService

    svc = SessionService(db_session)
    await svc.create_session(
        user_id=user.id,
        refresh_jti="extra-session-jti",
        user_agent_raw=None,
        ip_address=None,
    )
    await db_session.commit()

    response = await ac.request(
        "DELETE",
        "/api/sessions",
        json={"current_session_id": current_jti},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["revoked_count"] == 1
