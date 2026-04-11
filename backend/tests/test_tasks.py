import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.task import Task
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
async def task1(client, db_session, auth_user1):
    response = await client.post(
        "/api/tasks",
        json={"title": "Test Task 1", "description": "Description 1"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    return response.json()


@pytest.mark.asyncio
async def test_create_task_success(client, auth_user1):
    response = await client.post(
        "/api/tasks",
        json={"title": "New Task", "description": "Task description"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Task"
    assert data["description"] == "Task description"
    assert data["is_completed"] is False
    assert data["gtd_status"] == "inbox"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_task_with_gtd_status(client, auth_user1):
    response = await client.post(
        "/api/tasks",
        json={"title": "Next Task", "gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["gtd_status"] == "next"


@pytest.mark.asyncio
async def test_create_task_without_auth(client):
    response = await client.post(
        "/api/tasks",
        json={"title": "New Task", "description": "Task description"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_tasks_list_empty(client, auth_user1):
    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_get_tasks_list_with_tasks(client, db_session, auth_user1, task1):
    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Test Task 1"


@pytest.mark.asyncio
async def test_get_tasks_list_pagination(client, db_session, auth_user1):
    for i in range(5):
        await client.post(
            "/api/tasks",
            json={"title": f"Task {i}", "description": f"Description {i}"},
            headers={"Authorization": f"Bearer {auth_user1['token']}"},
        )

    response = await client.get(
        "/api/tasks?limit=2&offset=0",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5

    response = await client.get(
        "/api/tasks?limit=2&offset=2",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert len(data["items"]) == 2

    response = await client.get(
        "/api/tasks?limit=2&offset=4",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_tasks_list_without_auth(client):
    response = await client.get("/api/tasks")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_single_task_owner(client, auth_user1, task1):
    response = await client.get(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task1["id"]
    assert data["title"] == "Test Task 1"


@pytest.mark.asyncio
async def test_get_single_task_not_found(client, auth_user1):
    response = await client.get(
        "/api/tasks/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404
    assert "Task not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_single_task_not_owner(client, auth_user1, task1, auth_user2):
    response = await client.get(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_single_task_without_auth(client, task1):
    response = await client.get(f"/api/tasks/{task1['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_task_success(client, auth_user1, task1):
    response = await client.put(
        f"/api/tasks/{task1['id']}",
        json={"title": "Updated Title", "description": "Updated Description"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "Updated Description"


@pytest.mark.asyncio
async def test_update_task_partial(client, auth_user1, task1):
    response = await client.put(
        f"/api/tasks/{task1['id']}",
        json={"title": "Only Title Updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Only Title Updated"
    assert data["description"] == "Description 1"


@pytest.mark.asyncio
async def test_update_task_not_found(client, auth_user1):
    response = await client.put(
        "/api/tasks/00000000-0000-0000-0000-000000000000",
        json={"title": "Updated"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_task_not_owner(client, auth_user1, task1, auth_user2):
    response = await client.put(
        f"/api/tasks/{task1['id']}",
        json={"title": "Should Fail"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_task_without_auth(client, task1):
    response = await client.put(
        f"/api/tasks/{task1['id']}",
        json={"title": "Updated"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_toggle_task_success(client, auth_user1, task1):
    assert task1["is_completed"] is False

    response = await client.patch(
        f"/api/tasks/{task1['id']}/toggle",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_completed"] is True
    assert data["gtd_status"] == "completed"
    assert data["id"] == task1["id"]

    response = await client.patch(
        f"/api/tasks/{task1['id']}/toggle",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert data["is_completed"] is False
    assert data["gtd_status"] == "inbox"


@pytest.mark.asyncio
async def test_toggle_task_not_found(client, auth_user1):
    response = await client.patch(
        "/api/tasks/00000000-0000-0000-0000-000000000000/toggle",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_toggle_task_not_owner(client, auth_user1, task1, auth_user2):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/toggle",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_toggle_task_without_auth(client, task1):
    response = await client.patch(f"/api/tasks/{task1['id']}/toggle")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_task_success(client, db_session, auth_user1, task1):
    response = await client.delete(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 204

    result = await db_session.execute(
        select(Task).where(Task.id == task1["id"])
    )
    task = result.scalar_one_or_none()
    assert task is None


@pytest.mark.asyncio
async def test_delete_task_not_found(client, auth_user1):
    response = await client.delete(
        "/api/tasks/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_not_owner(client, auth_user1, task1, auth_user2):
    response = await client.delete(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_without_auth(client, task1):
    response = await client.delete(f"/api/tasks/{task1['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_user_sees_only_own_tasks(client, db_session, auth_user1, auth_user2):
    await client.post(
        "/api/tasks",
        json={"title": "User1 Task"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "User2 Task"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )

    user1_tasks = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert len(user1_tasks.json()["items"]) == 1
    assert user1_tasks.json()["items"][0]["title"] == "User1 Task"

    user2_tasks = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert len(user2_tasks.json()["items"]) == 1
    assert user2_tasks.json()["items"][0]["title"] == "User2 Task"


@pytest.mark.asyncio
async def test_move_task_to_next(client, auth_user1, task1):
    assert task1["gtd_status"] == "inbox"

    response = await client.patch(
        f"/api/tasks/{task1['id']}/move",
        json={"gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gtd_status"] == "next"


@pytest.mark.asyncio
async def test_move_task_to_waiting(client, auth_user1, task1):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/move",
        json={"gtd_status": "waiting"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gtd_status"] == "waiting"
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_move_task_to_completed(client, auth_user1, task1):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/move",
        json={"gtd_status": "completed"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gtd_status"] == "completed"
    assert data["is_completed"] is True
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_move_task_to_someday(client, auth_user1, task1):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/move",
        json={"gtd_status": "someday"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gtd_status"] == "someday"


@pytest.mark.asyncio
async def test_move_task_to_trash(client, auth_user1, task1):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/move",
        json={"gtd_status": "trash"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gtd_status"] == "trash"


@pytest.mark.asyncio
async def test_move_task_not_found(client, auth_user1):
    response = await client.patch(
        "/api/tasks/00000000-0000-0000-0000-000000000000/move",
        json={"gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_move_task_not_owner(client, auth_user1, task1, auth_user2):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/move",
        json={"gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user2['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_reorder_task(client, auth_user1, task1):
    response = await client.patch(
        f"/api/tasks/{task1['id']}/reorder",
        json={"position": 5},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["position"] == 5


@pytest.mark.asyncio
async def test_reorder_task_not_found(client, auth_user1):
    response = await client.patch(
        "/api/tasks/00000000-0000-0000-0000-000000000000/reorder",
        json={"position": 1},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_filter_tasks_by_gtd_status(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Inbox Task", "gtd_status": "inbox"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Next Task", "gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Waiting Task", "gtd_status": "waiting"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?gtd_status=inbox",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Inbox Task"

    response = await client.get(
        "/api/tasks?gtd_status=next",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Next Task"

    response = await client.get(
        "/api/tasks?gtd_status=waiting",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Waiting Task"


@pytest.mark.asyncio
async def test_search_tasks(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Buy groceries"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Read book"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?search=groceries",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Buy groceries"


@pytest.mark.asyncio
async def test_get_gtd_counts(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Inbox 1", "gtd_status": "inbox"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Inbox 2", "gtd_status": "inbox"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Next 1", "gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Waiting 1", "gtd_status": "waiting"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks/counts",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["inbox"] == 2
    assert data["next"] == 1
    assert data["waiting"] == 1
    assert data["someday"] == 0
    assert data["completed"] == 0
    assert data["trash"] == 0
