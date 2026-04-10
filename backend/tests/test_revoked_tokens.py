import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_refresh_token_with_revoked_token(client: AsyncClient, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "Password123!",
        },
    )

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "Password123!"},
    )
    initial_refresh_token = login_response.cookies.get("refresh_token")

    first_refresh = await client.post(
        "/api/auth/refresh", cookies={"refresh_token": initial_refresh_token}
    )
    assert first_refresh.status_code == 200

    second_refresh = await client.post(
        "/api/auth/refresh", cookies={"refresh_token": initial_refresh_token}
    )
    assert second_refresh.status_code == 401
    assert "Refresh token has been revoked" in second_refresh.json()["detail"]


@pytest.mark.asyncio
async def test_logout_adds_token_to_blacklist(client: AsyncClient, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "Password123!",
        },
    )

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "Password123!"},
    )
    refresh_token = login_response.cookies.get("refresh_token")

    logout_response = await client.post(
        "/api/auth/logout",
        cookies={"refresh_token": refresh_token}
    )
    assert logout_response.status_code == 200

    refresh_after_logout = await client.post(
        "/api/auth/refresh", cookies={"refresh_token": refresh_token}
    )
    assert refresh_after_logout.status_code == 401
    assert "Refresh token has been revoked" in refresh_after_logout.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_has_jti(client: AsyncClient, db_session):
    from app.security import decode_token

    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "Password123!",
        },
    )

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "Password123!"},
    )
    refresh_token = login_response.cookies.get("refresh_token")

    payload = decode_token(refresh_token)
    assert payload is not None
    assert "jti" in payload
    assert payload.get("type") == "refresh"
