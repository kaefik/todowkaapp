import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.user import User
from app.security import verify_password


@pytest_asyncio.fixture
async def authed_user(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "OldPass123!",
        },
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "OldPass123!"},
    )
    return {
        "access_token": login_resp.cookies.get("access_token"),
        "refresh_token": login_resp.cookies.get("refresh_token"),
    }


@pytest.mark.asyncio
async def test_change_password_success(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Пароль успешно изменён"

    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies

    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()
    assert verify_password("NewPass456!", user.password_hash)
    assert user.password_changed_at is not None


@pytest.mark.asyncio
async def test_change_password_wrong_current(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "WrongPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 400
    assert "Неверный текущий пароль" in response.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_same_password(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "OldPass123!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 400
    assert "совпадает" in response.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_weak_new(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "weak"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_change_password_requires_auth(client, db_session):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_change_password_old_refresh_revoked(client, db_session, authed_user):
    old_refresh = authed_user["refresh_token"]

    change_resp = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert change_resp.status_code == 200

    refresh_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password_new_refresh_works(client, db_session, authed_user):
    change_resp = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert change_resp.status_code == 200

    new_refresh = change_resp.cookies.get("refresh_token")
    new_access = change_resp.cookies.get("access_token")

    refresh_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": new_refresh},
    )
    assert refresh_resp.status_code == 200

    me_resp = await client.get(
        "/api/auth/me",
        cookies={"access_token": new_access},
    )
    assert me_resp.status_code == 200


@pytest.mark.asyncio
async def test_login_with_new_password_after_change(client, db_session, authed_user):
    await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )

    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "NewPass456!"},
    )
    assert login_resp.status_code == 200

    old_login = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "OldPass123!"},
    )
    assert old_login.status_code == 401
