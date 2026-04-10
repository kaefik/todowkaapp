import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.area import Area
from app.models.user import User


@pytest_asyncio.fixture
async def auth_user1(client, db_session):
    user_data = {
        "username": "user1",
        "email": "user1@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login", json={"username": "user1", "password": "Password123!"}
    )
    token = login_response.json()["access_token"]
    result = await db_session.execute(select(User).where(User.username == "user1"))
    user = result.scalar_one()
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def auth_user2(client, db_session):
    user_data = {
        "username": "user2",
        "email": "user2@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login", json={"username": "user2", "password": "Password123!"}
    )
    token = login_response.json()["access_token"]
    result = await db_session.execute(select(User).where(User.username == "user2"))
    user = result.scalar_one()
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def area1(client, auth_user1):
    response = await client.post(
        "/api/areas",
        json={"name": "Work", "description": "Work-related tasks", "color": "#FF0000"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest.mark.asyncio
async def test_create_area_success(client, auth_user1):
    response = await client.post(
        "/api/areas",
        json={"name": "Personal", "description": "Personal stuff", "color": "#00FF00"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Personal"
    assert data["description"] == "Personal stuff"
    assert data["color"] == "#00FF00"
    assert data["id"] is not None
    assert data["created_at"] is not None


@pytest.mark.asyncio
async def test_create_area_minimal(client, auth_user1):
    response = await client.post(
        "/api/areas",
        json={"name": "Simple"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Simple"
    assert data["description"] is None
    assert data["color"] is None


@pytest.mark.asyncio
async def test_create_area_duplicate_name(client, auth_user1):
    await client.post(
        "/api/areas",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.post(
        "/api/areas",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_area_without_auth(client):
    response = await client.post(
        "/api/areas",
        json={"name": "Work"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_areas_empty(client, auth_user1):
    response = await client.get(
        "/api/areas",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_areas_with_items(client, auth_user1, area1):
    response = await client.get(
        "/api/areas",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Work"


@pytest.mark.asyncio
async def test_list_areas_pagination(client, auth_user1):
    for i in range(5):
        await client.post(
            "/api/areas",
            json={"name": f"Area {i}"},
            headers={"Authorization": f"Bearer {auth_user1['token']}"},
        )

    response = await client.get(
        "/api/areas?limit=2&offset=0",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_get_area_success(client, auth_user1, area1):
    response = await client.get(
        f"/api/areas/{area1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == area1["id"]
    assert data["name"] == "Work"
    assert data["description"] == "Work-related tasks"
    assert data["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_get_area_not_found(client, auth_user1):
    response = await client.get(
        "/api/areas/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_area_not_owner(client, auth_user1, area1, auth_user2):
    response = await client.get(
        f"/api/areas/{area1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_area_success(client, auth_user1, area1):
    response = await client.put(
        f"/api/areas/{area1['id']}",
        json={"name": "Office", "color": "#0000FF", "description": "Office tasks"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Office"
    assert data["color"] == "#0000FF"
    assert data["description"] == "Office tasks"


@pytest.mark.asyncio
async def test_update_area_partial(client, auth_user1, area1):
    response = await client.put(
        f"/api/areas/{area1['id']}",
        json={"name": "Updated Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Work"
    assert data["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_update_area_duplicate_name(client, auth_user1, area1):
    await client.post(
        "/api/areas",
        json={"name": "Home"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.put(
        f"/api/areas/{area1['id']}",
        json={"name": "Home"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_area_not_found(client, auth_user1):
    response = await client.put(
        "/api/areas/00000000-0000-0000-0000-000000000000",
        json={"name": "Updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_area_not_owner(client, auth_user1, area1, auth_user2):
    response = await client.put(
        f"/api/areas/{area1['id']}",
        json={"name": "Hacked"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_area_success(client, db_session, auth_user1, area1):
    response = await client.delete(
        f"/api/areas/{area1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204

    result = await db_session.execute(
        select(Area).where(Area.id == area1["id"])
    )
    area = result.scalar_one_or_none()
    assert area is None


@pytest.mark.asyncio
async def test_delete_area_not_found(client, auth_user1):
    response = await client.delete(
        "/api/areas/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_area_not_owner(client, auth_user1, area1, auth_user2):
    response = await client.delete(
        f"/api/areas/{area1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_area_without_auth(client, area1):
    response = await client.delete(f"/api/areas/{area1['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_user_sees_only_own_areas(client, auth_user1, auth_user2):
    await client.post(
        "/api/areas",
        json={"name": "User1 Area"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/areas",
        json={"name": "User2 Area"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )

    user1_areas = await client.get(
        "/api/areas",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert len(user1_areas.json()["items"]) == 1
    assert user1_areas.json()["items"][0]["name"] == "User1 Area"

    user2_areas = await client.get(
        "/api/areas",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert len(user2_areas.json()["items"]) == 1
    assert user2_areas.json()["items"][0]["name"] == "User2 Area"


@pytest.mark.asyncio
async def test_same_name_different_users(client, auth_user1, auth_user2):
    response1 = await client.post(
        "/api/areas",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response1.status_code == 201

    response2 = await client.post(
        "/api/areas",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response2.status_code == 201
