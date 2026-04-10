import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.context import Context
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
async def context1(client, auth_user1):
    response = await client.post(
        "/api/contexts",
        json={"name": "Work", "color": "#FF0000", "icon": "briefcase"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest.mark.asyncio
async def test_create_context_success(client, auth_user1):
    response = await client.post(
        "/api/contexts",
        json={"name": "Home", "color": "#00FF00", "icon": "house"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Home"
    assert data["color"] == "#00FF00"
    assert data["icon"] == "house"
    assert data["id"] is not None
    assert data["created_at"] is not None


@pytest.mark.asyncio
async def test_create_context_minimal(client, auth_user1):
    response = await client.post(
        "/api/contexts",
        json={"name": "Simple"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Simple"
    assert data["color"] is None
    assert data["icon"] is None


@pytest.mark.asyncio
async def test_create_context_duplicate_name(client, auth_user1):
    await client.post(
        "/api/contexts",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.post(
        "/api/contexts",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_context_without_auth(client):
    response = await client.post(
        "/api/contexts",
        json={"name": "Work"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_contexts_empty(client, auth_user1):
    response = await client.get(
        "/api/contexts",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_contexts_with_items(client, auth_user1, context1):
    response = await client.get(
        "/api/contexts",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Work"


@pytest.mark.asyncio
async def test_list_contexts_pagination(client, auth_user1):
    for i in range(5):
        await client.post(
            "/api/contexts",
            json={"name": f"Context {i}"},
            headers={"Authorization": f"Bearer {auth_user1['token']}"},
        )

    response = await client.get(
        "/api/contexts?limit=2&offset=0",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_get_context_success(client, auth_user1, context1):
    response = await client.get(
        f"/api/contexts/{context1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == context1["id"]
    assert data["name"] == "Work"
    assert data["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_get_context_not_found(client, auth_user1):
    response = await client.get(
        "/api/contexts/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_context_not_owner(client, auth_user1, context1, auth_user2):
    response = await client.get(
        f"/api/contexts/{context1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_context_success(client, auth_user1, context1):
    response = await client.put(
        f"/api/contexts/{context1['id']}",
        json={"name": "Office", "color": "#0000FF"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Office"
    assert data["color"] == "#0000FF"
    assert data["icon"] == "briefcase"


@pytest.mark.asyncio
async def test_update_context_partial(client, auth_user1, context1):
    response = await client.put(
        f"/api/contexts/{context1['id']}",
        json={"name": "Updated Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Work"
    assert data["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_update_context_duplicate_name(client, auth_user1, context1):
    await client.post(
        "/api/contexts",
        json={"name": "Home"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.put(
        f"/api/contexts/{context1['id']}",
        json={"name": "Home"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_context_not_found(client, auth_user1):
    response = await client.put(
        "/api/contexts/00000000-0000-0000-0000-000000000000",
        json={"name": "Updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_context_not_owner(client, auth_user1, context1, auth_user2):
    response = await client.put(
        f"/api/contexts/{context1['id']}",
        json={"name": "Hacked"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_context_success(client, db_session, auth_user1, context1):
    response = await client.delete(
        f"/api/contexts/{context1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204

    result = await db_session.execute(
        select(Context).where(Context.id == context1["id"])
    )
    context = result.scalar_one_or_none()
    assert context is None


@pytest.mark.asyncio
async def test_delete_context_not_found(client, auth_user1):
    response = await client.delete(
        "/api/contexts/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_context_not_owner(client, auth_user1, context1, auth_user2):
    response = await client.delete(
        f"/api/contexts/{context1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_context_without_auth(client, context1):
    response = await client.delete(f"/api/contexts/{context1['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_user_sees_only_own_contexts(client, auth_user1, auth_user2):
    await client.post(
        "/api/contexts",
        json={"name": "User1 Context"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/contexts",
        json={"name": "User2 Context"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )

    user1_contexts = await client.get(
        "/api/contexts",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert len(user1_contexts.json()["items"]) == 1
    assert user1_contexts.json()["items"][0]["name"] == "User1 Context"

    user2_contexts = await client.get(
        "/api/contexts",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert len(user2_contexts.json()["items"]) == 1
    assert user2_contexts.json()["items"][0]["name"] == "User2 Context"


@pytest.mark.asyncio
async def test_same_name_different_users(client, auth_user1, auth_user2):
    response1 = await client.post(
        "/api/contexts",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response1.status_code == 201

    response2 = await client.post(
        "/api/contexts",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response2.status_code == 201
