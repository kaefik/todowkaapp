import pytest
from sqlalchemy import select
from app.config import settings
from app.models.user import User


@pytest.fixture(autouse=True)
def override_settings():
    original_secret = settings.secret_key
    settings.secret_key = "test-secret-key-32-chars-long"
    yield
    settings.secret_key = original_secret


@pytest.mark.asyncio
async def test_register_valid_data(client, db_session):
    response = await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_duplicate_username(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test1@example.com",
            "password": "password123",
        },
    )

    response = await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test2@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert "Username already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser1",
            "email": "test@example.com",
            "password": "password123",
        },
    )

    response = await client.post(
        "/api/auth/register",
        json={
            "username": "testuser2",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert "Email already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_disabled(client, db_session, monkeypatch):
    from app import config

    monkeypatch.setattr(config.settings, "registration_enabled", False)

    response = await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 403
    assert "Registration is disabled" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_valid_credentials(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        },
    )

    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["username"] == "testuser"
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_credentials(client, db_session):
    response = await client.post(
        "/api/auth/login",
        json={"username": "nonexistent", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_inactive_user(client, db_session):
    result = await db_session.execute(
        select(User).where(User.username == "testuser")
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword",
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()
    else:
        user.is_active = False
        await db_session.commit()

    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 401
    assert "Inactive user" in response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_flow(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        },
    )

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    initial_refresh_token = login_response.cookies.get("refresh_token")
    initial_access_token = login_response.json()["access_token"]

    refresh_response = await client.post(
        "/api/auth/refresh", cookies={"refresh_token": initial_refresh_token}
    )
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert data["access_token"] != initial_access_token
    new_refresh_token = refresh_response.cookies.get("refresh_token")
    assert new_refresh_token is not None


@pytest.mark.asyncio
async def test_refresh_invalid_token(client, db_session):
    response = await client.post(
        "/api/auth/refresh", cookies={"refresh_token": "invalid_token"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_clears_cookie(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        },
    )

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    assert login_response.cookies.get("refresh_token") is not None

    logout_response = await client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json() == {"message": "Logged out successfully"}
    assert logout_response.cookies.get("refresh_token") == ""


@pytest.mark.asyncio
async def test_me_returns_current_user(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        },
    )

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    access_token = login_response.json()["access_token"]

    me_response = await client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    data = me_response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_me_requires_authentication(client, db_session):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_invalid_token(client, db_session):
    response = await client.get(
        "/api/auth/me", headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
