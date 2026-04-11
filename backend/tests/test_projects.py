import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.project import Project
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
        json={"name": "Work Area"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest_asyncio.fixture
async def project1(client, auth_user1):
    response = await client.post(
        "/api/projects",
        json={"name": "Project Alpha", "description": "First project", "color": "#3B82F6"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest.mark.asyncio
async def test_create_project_success(client, auth_user1):
    response = await client.post(
        "/api/projects",
        json={"name": "My Project", "description": "A test project", "color": "#FF0000"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Project"
    assert data["description"] == "A test project"
    assert data["color"] == "#FF0000"
    assert data["is_active"] is True
    assert data["id"] is not None
    assert data["created_at"] is not None


@pytest.mark.asyncio
async def test_create_project_minimal(client, auth_user1):
    response = await client.post(
        "/api/projects",
        json={"name": "Simple"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Simple"
    assert data["description"] is None
    assert data["color"] is None
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_create_project_with_area(client, auth_user1, area1):
    response = await client.post(
        "/api/projects",
        json={"name": "Project in Area", "area_id": area1["id"]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["area_id"] == area1["id"]


@pytest.mark.asyncio
async def test_create_project_duplicate_name(client, auth_user1):
    await client.post(
        "/api/projects",
        json={"name": "Unique"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.post(
        "/api/projects",
        json={"name": "Unique"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_project_without_auth(client):
    response = await client.post(
        "/api/projects",
        json={"name": "Project"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_projects_empty(client, auth_user1):
    response = await client.get(
        "/api/projects",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_projects_with_items(client, auth_user1, project1):
    response = await client.get(
        "/api/projects",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Project Alpha"
    assert "progress" in data["items"][0]


@pytest.mark.asyncio
async def test_list_projects_pagination(client, auth_user1):
    for i in range(5):
        await client.post(
            "/api/projects",
            json={"name": f"Project {i}"},
            headers={"Authorization": f"Bearer {auth_user1['token']}"},
        )

    response = await client.get(
        "/api/projects?limit=2&offset=0",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_get_project_success(client, auth_user1, project1):
    response = await client.get(
        f"/api/projects/{project1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project1["id"]
    assert data["name"] == "Project Alpha"
    assert "progress" in data
    assert data["progress"]["tasks_total"] == 0
    assert data["progress"]["tasks_completed"] == 0
    assert data["progress"]["progress_percent"] == 0.0


@pytest.mark.asyncio
async def test_get_project_not_found(client, auth_user1):
    response = await client.get(
        "/api/projects/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_not_owner(client, auth_user1, project1, auth_user2):
    response = await client.get(
        f"/api/projects/{project1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project_success(client, auth_user1, project1):
    response = await client.put(
        f"/api/projects/{project1['id']}",
        json={"name": "Updated Project", "color": "#0000FF", "description": "Updated desc"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project"
    assert data["color"] == "#0000FF"
    assert data["description"] == "Updated desc"


@pytest.mark.asyncio
async def test_update_project_partial(client, auth_user1, project1):
    response = await client.put(
        f"/api/projects/{project1['id']}",
        json={"name": "New Name"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["color"] == "#3B82F6"


@pytest.mark.asyncio
async def test_update_project_duplicate_name(client, auth_user1, project1):
    await client.post(
        "/api/projects",
        json={"name": "Other Project"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    response = await client.put(
        f"/api/projects/{project1['id']}",
        json={"name": "Other Project"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_project_not_found(client, auth_user1):
    response = await client.put(
        "/api/projects/00000000-0000-0000-0000-000000000000",
        json={"name": "Updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project_not_owner(client, auth_user1, project1, auth_user2):
    response = await client.put(
        f"/api/projects/{project1['id']}",
        json={"name": "Hacked"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project_set_inactive(client, auth_user1, project1):
    response = await client.put(
        f"/api/projects/{project1['id']}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


@pytest.mark.asyncio
async def test_delete_project_success(client, db_session, auth_user1, project1):
    response = await client.delete(
        f"/api/projects/{project1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204

    result = await db_session.execute(
        select(Project).where(Project.id == project1["id"])
    )
    project = result.scalar_one_or_none()
    assert project is None


@pytest.mark.asyncio
async def test_delete_project_not_found(client, auth_user1):
    response = await client.delete(
        "/api/projects/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_not_owner(client, auth_user1, project1, auth_user2):
    response = await client.delete(
        f"/api/projects/{project1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_without_auth(client, project1):
    response = await client.delete(f"/api/projects/{project1['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_user_sees_only_own_projects(client, auth_user1, auth_user2):
    await client.post(
        "/api/projects",
        json={"name": "User1 Project"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/projects",
        json={"name": "User2 Project"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )

    user1_projects = await client.get(
        "/api/projects",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert len(user1_projects.json()["items"]) == 1
    assert user1_projects.json()["items"][0]["name"] == "User1 Project"

    user2_projects = await client.get(
        "/api/projects",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert len(user2_projects.json()["items"]) == 1
    assert user2_projects.json()["items"][0]["name"] == "User2 Project"


@pytest.mark.asyncio
async def test_same_name_different_users(client, auth_user1, auth_user2):
    response1 = await client.post(
        "/api/projects",
        json={"name": "Shared Name"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response1.status_code == 201

    response2 = await client.post(
        "/api/projects",
        json={"name": "Shared Name"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response2.status_code == 201


@pytest.mark.asyncio
async def test_progress_empty_project(client, auth_user1, project1):
    response = await client.get(
        f"/api/projects/{project1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    progress = response.json()["progress"]
    assert progress["tasks_total"] == 0
    assert progress["tasks_completed"] == 0
    assert progress["progress_percent"] == 0.0


@pytest.mark.asyncio
async def test_progress_with_tasks(client, auth_user1, project1):
    headers = {"Authorization": f"Bearer {auth_user1['token']}"}

    await client.post(
        "/api/tasks",
        json={"title": "Task 1", "project_id": project1["id"]},
        headers=headers,
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task 2", "project_id": project1["id"]},
        headers=headers,
    )

    response = await client.get(
        f"/api/projects/{project1['id']}",
        headers=headers,
    )
    progress = response.json()["progress"]
    assert progress["tasks_total"] == 2
    assert progress["tasks_completed"] == 0
    assert progress["progress_percent"] == 0.0


@pytest.mark.asyncio
async def test_progress_with_completed_tasks(client, auth_user1, project1):
    headers = {"Authorization": f"Bearer {auth_user1['token']}"}

    task1 = await client.post(
        "/api/tasks",
        json={"title": "Task 1", "project_id": project1["id"]},
        headers=headers,
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task 2", "project_id": project1["id"]},
        headers=headers,
    )

    await client.patch(
        f"/api/tasks/{task1.json()['id']}/toggle",
        headers=headers,
    )

    response = await client.get(
        f"/api/projects/{project1['id']}",
        headers=headers,
    )
    progress = response.json()["progress"]
    assert progress["tasks_total"] == 2
    assert progress["tasks_completed"] == 1
    assert progress["progress_percent"] == 50.0


@pytest.mark.asyncio
async def test_progress_all_completed(client, auth_user1, project1):
    headers = {"Authorization": f"Bearer {auth_user1['token']}"}

    task1 = await client.post(
        "/api/tasks",
        json={"title": "Task 1", "project_id": project1["id"]},
        headers=headers,
    )
    task2 = await client.post(
        "/api/tasks",
        json={"title": "Task 2", "project_id": project1["id"]},
        headers=headers,
    )

    await client.patch(f"/api/tasks/{task1.json()['id']}/toggle", headers=headers)
    await client.patch(f"/api/tasks/{task2.json()['id']}/toggle", headers=headers)

    response = await client.get(
        f"/api/projects/{project1['id']}",
        headers=headers,
    )
    progress = response.json()["progress"]
    assert progress["tasks_total"] == 2
    assert progress["tasks_completed"] == 2
    assert progress["progress_percent"] == 100.0


@pytest.mark.asyncio
async def test_get_project_tasks(client, auth_user1, project1):
    headers = {"Authorization": f"Bearer {auth_user1['token']}"}

    await client.post(
        "/api/tasks",
        json={"title": "Project Task 1", "project_id": project1["id"]},
        headers=headers,
    )
    await client.post(
        "/api/tasks",
        json={"title": "Project Task 2", "project_id": project1["id"]},
        headers=headers,
    )
    await client.post(
        "/api/tasks",
        json={"title": "Regular Task"},
        headers=headers,
    )

    response = await client.get(
        f"/api/projects/{project1['id']}/tasks",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_project_tasks_not_found(client, auth_user1):
    response = await client.get(
        "/api/projects/00000000-0000-0000-0000-000000000000/tasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404
