import pytest
import pytest_asyncio

from app.models.user import User


@pytest_asyncio.fixture
async def multiple_users(db_session):
    users = [
        User(
            username=f"user{i}",
            email=f"user{i}@example.com",
            password_hash="hashed",
        )
        for i in range(3)
    ]
    db_session.add_all(users)
    await db_session.commit()
    return users


@pytest.mark.asyncio
async def test_get_config_empty_db(client):
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert "registration_enabled" in data
    assert "max_users" in data
    assert "current_users" in data
    assert "registration_available" in data
    assert "invite_code_required" in data
    
    assert data["current_users"] == 0
    assert isinstance(data["registration_enabled"], bool)
    assert isinstance(data["invite_code_required"], bool)


@pytest.mark.asyncio
async def test_get_config_with_users(client, multiple_users):
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["current_users"] == 3


@pytest.mark.asyncio
async def test_get_config_max_users_limit(client, monkeypatch, db_session):
    from app import config
    
    monkeypatch.setattr(config.settings, "max_users", 2)
    monkeypatch.setattr(config.settings, "registration_enabled", True)
    
    users = [
        User(
            username=f"user{i}",
            email=f"user{i}@example.com",
            password_hash="hashed",
        )
        for i in range(3)
    ]
    db_session.add_all(users)
    await db_session.commit()
    
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["max_users"] == 2
    assert data["current_users"] == 3
    assert data["registration_enabled"] is True
    assert data["registration_available"] is False


@pytest.mark.asyncio
async def test_get_config_below_max_users(client, monkeypatch, db_session):
    from app import config
    
    monkeypatch.setattr(config.settings, "max_users", 5)
    monkeypatch.setattr(config.settings, "registration_enabled", True)
    
    user = User(
        username="user1",
        email="user1@example.com",
        password_hash="hashed",
    )
    db_session.add(user)
    await db_session.commit()
    
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["max_users"] == 5
    assert data["current_users"] == 1
    assert data["registration_enabled"] is True
    assert data["registration_available"] is True


@pytest.mark.asyncio
async def test_get_config_no_max_users(client, monkeypatch):
    from app import config
    
    monkeypatch.setattr(config.settings, "max_users", None)
    monkeypatch.setattr(config.settings, "registration_enabled", True)
    
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["max_users"] is None
    assert data["registration_available"] is True


@pytest.mark.asyncio
async def test_get_config_invite_code_required(client, monkeypatch):
    from app import config
    
    monkeypatch.setattr(config.settings, "invite_code", "SECRET123")
    
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["invite_code_required"] is True


@pytest.mark.asyncio
async def test_get_config_invite_code_not_required(client, monkeypatch):
    from app import config
    
    monkeypatch.setattr(config.settings, "invite_code", None)
    
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["invite_code_required"] is False


@pytest.mark.asyncio
async def test_get_config_registration_disabled(client, monkeypatch):
    from app import config
    
    monkeypatch.setattr(config.settings, "registration_enabled", False)
    
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    
    assert data["registration_enabled"] is False
    assert data["registration_available"] is False