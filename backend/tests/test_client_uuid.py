import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def auth_client(client):
    user_data = {
        "username": "uuidtest",
        "email": "uuidtest@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login",
        json={"username": "uuidtest", "password": "Password123!"},
    )
    token = login_response.json()["access_token"]
    return client, token


CLIENT_UUID = "550e8400-e29b-41d4-a716-446655440000"


@pytest.mark.asyncio
async def test_create_task_with_client_id(auth_client):
    client, token = auth_client
    response = await client.post(
        "/api/tasks",
        json={"title": "Task with ID", "id": CLIENT_UUID},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == CLIENT_UUID


@pytest.mark.asyncio
async def test_create_task_without_client_id(auth_client):
    client, token = auth_client
    response = await client.post(
        "/api/tasks",
        json={"title": "Task without ID"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert len(data["id"]) == 36


@pytest.mark.asyncio
async def test_create_project_with_client_id(auth_client):
    client, token = auth_client
    response = await client.post(
        "/api/projects",
        json={"name": "Project with ID", "id": CLIENT_UUID},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == CLIENT_UUID


@pytest.mark.asyncio
async def test_create_area_with_client_id(auth_client):
    client, token = auth_client
    response = await client.post(
        "/api/areas",
        json={"name": "Area with ID", "id": CLIENT_UUID},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == CLIENT_UUID


@pytest.mark.asyncio
async def test_create_context_with_client_id(auth_client):
    client, token = auth_client
    response = await client.post(
        "/api/contexts",
        json={"name": "Context with ID", "id": CLIENT_UUID},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == CLIENT_UUID


@pytest.mark.asyncio
async def test_create_tag_with_client_id(auth_client):
    client, token = auth_client
    response = await client.post(
        "/api/tags",
        json={"name": "Tag with ID", "id": CLIENT_UUID},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == CLIENT_UUID
