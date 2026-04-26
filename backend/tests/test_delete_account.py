import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.user import User
from app.models.task import Task


@pytest_asyncio.fixture
async def authed_user_with_task(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPass123!",
        },
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "TestPass123!"},
    )

    await client.post(
        "/api/tasks",
        json={"title": "My task"},
        cookies={"access_token": login_resp.cookies.get("access_token")},
    )

    return {
        "access_token": login_resp.cookies.get("access_token"),
        "refresh_token": login_resp.cookies.get("refresh_token"),
    }


@pytest.mark.asyncio
async def test_delete_account_success(client, db_session, authed_user_with_task):
    response = await client.request(
        "DELETE",
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Аккаунт удалён"

    access_cookie = response.cookies.get("access_token")
    refresh_cookie = response.cookies.get("refresh_token")
    assert access_cookie is None or access_cookie == ""
    assert refresh_cookie is None or refresh_cookie == ""

    result = await db_session.execute(select(User).where(User.username == "testuser"))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_account_cascades_tasks(client, db_session, authed_user_with_task):
    response = await client.request(
        "DELETE",
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 200

    result = await db_session.execute(select(Task))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_account_wrong_password(client, db_session, authed_user_with_task):
    response = await client.request(
        "DELETE",
        "/api/auth/delete-account",
        json={"password": "WrongPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 401
    assert "Неверный пароль" in response.json()["detail"]

    result = await db_session.execute(select(User).where(User.username == "testuser"))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_delete_account_requires_auth(client, db_session):
    response = await client.request(
        "DELETE",
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_account_empty_password(client, db_session, authed_user_with_task):
    response = await client.request(
        "DELETE",
        "/api/auth/delete-account",
        json={"password": ""},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_account_revokes_refresh_token(client, db_session, authed_user_with_task):
    old_refresh = authed_user_with_task["refresh_token"]

    response = await client.request(
        "DELETE",
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 200

    refresh_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert refresh_resp.status_code == 401
