import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.tag import Tag
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
async def tag1(client, auth_user1):
    response = await client.post(
        "/api/tags",
        json={"name": "urgent", "color": "#FF0000"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest_asyncio.fixture
async def task1(client, auth_user1):
    response = await client.post(
        "/api/tasks",
        json={"title": "Test Task 1"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest.mark.asyncio
async def test_create_tag_success(client, auth_user1):
    response = await client.post(
        "/api/tags",
        json={"name": "important", "color": "#FF0000"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "important"
    assert data["color"] == "#FF0000"
    assert data["id"] is not None
    assert data["created_at"] is not None


@pytest.mark.asyncio
async def test_create_tag_minimal(client, auth_user1):
    response = await client.post(
        "/api/tags",
        json={"name": "simple"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "simple"
    assert data["color"] is None


@pytest.mark.asyncio
async def test_create_tag_duplicate_name(client, auth_user1):
    await client.post(
        "/api/tags",
        json={"name": "urgent"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.post(
        "/api/tags",
        json={"name": "urgent"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_tag_without_auth(client):
    response = await client.post(
        "/api/tags",
        json={"name": "test"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_tags_empty(client, auth_user1):
    response = await client.get(
        "/api/tags",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_tags_with_items(client, auth_user1, tag1):
    response = await client.get(
        "/api/tags",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["name"] == "urgent"


@pytest.mark.asyncio
async def test_list_tags_pagination(client, auth_user1):
    for i in range(5):
        await client.post(
            "/api/tags",
            json={"name": f"Tag {i}"},
            headers={"Authorization": f"Bearer {auth_user1['token']}"},
        )

    response = await client.get(
        "/api/tags?limit=2&offset=0",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_get_tag_success(client, auth_user1, tag1):
    response = await client.get(
        f"/api/tags/{tag1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == tag1["id"]
    assert data["name"] == "urgent"
    assert data["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_get_tag_not_found(client, auth_user1):
    response = await client.get(
        "/api/tags/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_tag_not_owner(client, auth_user1, tag1, auth_user2):
    response = await client.get(
        f"/api/tags/{tag1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_tag_success(client, auth_user1, tag1):
    response = await client.put(
        f"/api/tags/{tag1['id']}",
        json={"name": "critical", "color": "#00FF00"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "critical"
    assert data["color"] == "#00FF00"


@pytest.mark.asyncio
async def test_update_tag_partial(client, auth_user1, tag1):
    response = await client.put(
        f"/api/tags/{tag1['id']}",
        json={"name": "updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "updated"
    assert data["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_update_tag_duplicate_name(client, auth_user1, tag1):
    await client.post(
        "/api/tags",
        json={"name": "home"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.put(
        f"/api/tags/{tag1['id']}",
        json={"name": "home"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_tag_not_found(client, auth_user1):
    response = await client.put(
        "/api/tags/00000000-0000-0000-0000-000000000000",
        json={"name": "updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_tag_not_owner(client, auth_user1, tag1, auth_user2):
    response = await client.put(
        f"/api/tags/{tag1['id']}",
        json={"name": "hacked"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_tag_success(client, db_session, auth_user1, tag1):
    response = await client.delete(
        f"/api/tags/{tag1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204

    result = await db_session.execute(
        select(Tag).where(Tag.id == tag1["id"])
    )
    tag = result.scalar_one_or_none()
    assert tag is None


@pytest.mark.asyncio
async def test_delete_tag_not_found(client, auth_user1):
    response = await client.delete(
        "/api/tags/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_tag_not_owner(client, auth_user1, tag1, auth_user2):
    response = await client.delete(
        f"/api/tags/{tag1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_tag_without_auth(client, tag1):
    response = await client.delete(f"/api/tags/{tag1['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_user_sees_only_own_tags(client, auth_user1, auth_user2):
    await client.post(
        "/api/tags",
        json={"name": "User1 Tag"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tags",
        json={"name": "User2 Tag"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )

    user1_tags = await client.get(
        "/api/tags",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert len(user1_tags.json()["items"]) == 1
    assert user1_tags.json()["items"][0]["name"] == "User1 Tag"

    user2_tags = await client.get(
        "/api/tags",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert len(user2_tags.json()["items"]) == 1
    assert user2_tags.json()["items"][0]["name"] == "User2 Tag"


@pytest.mark.asyncio
async def test_same_name_different_users(client, auth_user1, auth_user2):
    response1 = await client.post(
        "/api/tags",
        json={"name": "work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response1.status_code == 201

    response2 = await client.post(
        "/api/tags",
        json={"name": "work"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response2.status_code == 201


@pytest.mark.asyncio
async def test_add_tag_to_task(client, auth_user1, tag1, task1):
    response = await client.post(
        f"/api/tags/tasks/{task1['id']}/tags",
        json={"tag_id": tag1["id"]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == tag1["id"]

    task_response = await client.get(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    task_data = task_response.json()
    assert len(task_data["tags"]) == 1
    assert task_data["tags"][0]["name"] == "urgent"


@pytest.mark.asyncio
async def test_add_tag_to_task_duplicate(client, auth_user1, tag1, task1):
    await client.post(
        f"/api/tags/tasks/{task1['id']}/tags",
        json={"tag_id": tag1["id"]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.post(
        f"/api/tags/tasks/{task1['id']}/tags",
        json={"tag_id": tag1["id"]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_remove_tag_from_task(client, auth_user1, tag1, task1):
    await client.post(
        f"/api/tags/tasks/{task1['id']}/tags",
        json={"tag_id": tag1["id"]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.delete(
        f"/api/tags/tasks/{task1['id']}/tags/{tag1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204

    task_response = await client.get(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    task_data = task_response.json()
    assert len(task_data["tags"]) == 0


@pytest.mark.asyncio
async def test_remove_tag_from_task_not_attached(client, auth_user1, tag1, task1):
    response = await client.delete(
        f"/api/tags/tasks/{task1['id']}/tags/{tag1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_create_task_with_tags(client, auth_user1, tag1):
    response = await client.post(
        "/api/tasks",
        json={"title": "Tagged Task", "tag_ids": [tag1["id"]]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["tags"]) == 1
    assert data["tags"][0]["name"] == "urgent"


@pytest.mark.asyncio
async def test_update_task_tags(client, auth_user1, tag1, task1):
    response = await client.put(
        f"/api/tasks/{task1['id']}",
        json={"tag_ids": [tag1["id"]]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["tags"]) == 1
    assert data["tags"][0]["name"] == "urgent"


@pytest.mark.asyncio
async def test_update_task_clear_tags(client, auth_user1, tag1, task1):
    await client.put(
        f"/api/tasks/{task1['id']}",
        json={"tag_ids": [tag1["id"]]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.put(
        f"/api/tasks/{task1['id']}",
        json={"tag_ids": []},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["tags"]) == 0


@pytest.mark.asyncio
async def test_task_list_includes_tags(client, auth_user1, tag1):
    await client.post(
        "/api/tasks",
        json={"title": "Tagged Task", "tag_ids": [tag1["id"]]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    tagged = [t for t in items if t["title"] == "Tagged Task"][0]
    assert len(tagged["tags"]) == 1
    assert tagged["tags"][0]["name"] == "urgent"
