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


@pytest.mark.asyncio
async def test_create_subtask(client, auth_user1, task1):
    response = await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Subtask 1"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Subtask 1"
    assert data["parent_task_id"] == task1["id"]
    assert data["gtd_status"] == "inbox"


@pytest.mark.asyncio
async def test_list_subtasks(client, auth_user1, task1):
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Subtask A"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Subtask B"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks/{task1['id']}/subtasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Subtask A"
    assert data[1]["title"] == "Subtask B"


@pytest.mark.asyncio
async def test_subtask_counts_in_task_response(client, auth_user1, task1):
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Sub 1"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Sub 2"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["subtasks_count"] == 2
    assert data["subtasks_completed"] == 0


@pytest.mark.asyncio
async def test_subtask_toggle_and_counts(client, auth_user1, task1):
    sub1 = await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Sub 1"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert sub1.status_code == 201
    sub1_data = sub1.json()

    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Sub 2"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    await client.patch(
        f"/api/tasks/{sub1_data['id']}/toggle",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert data["subtasks_count"] == 2
    assert data["subtasks_completed"] == 1


@pytest.mark.asyncio
async def test_subtasks_not_in_root_list(client, auth_user1, task1):
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Hidden Subtask"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Test Task 1"


@pytest.mark.asyncio
async def test_include_subtasks_param(client, auth_user1, task1):
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Visible Subtask"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?include_subtasks=true",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    data = response.json()
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_create_subtask_not_found(client, auth_user1):
    response = await client.post(
        "/api/tasks/00000000-0000-0000-0000-000000000000/subtasks",
        json={"title": "Orphan"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cascade_delete_subtasks(client, db_session, auth_user1, task1):
    await client.post(
        f"/api/tasks/{task1['id']}/subtasks",
        json={"title": "Will be deleted"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    await client.delete(
        f"/api/tasks/{task1['id']}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    result = await db_session.execute(select(Task))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_filter_by_context(client, auth_user1):
    ctx = await client.post(
        "/api/contexts",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    ctx_id = ctx.json()["id"]

    await client.post(
        "/api/tasks",
        json={"title": "Task with context", "context_id": ctx_id},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task without context"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks?context_id={ctx_id}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Task with context"


@pytest.mark.asyncio
async def test_filter_by_area(client, auth_user1):
    area = await client.post(
        "/api/areas",
        json={"name": "Health"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    area_id = area.json()["id"]

    await client.post(
        "/api/tasks",
        json={"title": "Task with area", "area_id": area_id},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task without area"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks?area_id={area_id}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Task with area"


@pytest.mark.asyncio
async def test_filter_by_project(client, auth_user1):
    proj = await client.post(
        "/api/projects",
        json={"name": "My Project"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    proj_id = proj.json()["id"]

    await client.post(
        "/api/tasks",
        json={"title": "Task in project", "project_id": proj_id},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task without project"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks?project_id={proj_id}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Task in project"


@pytest.mark.asyncio
async def test_filter_by_tag(client, auth_user1):
    tag = await client.post(
        "/api/tags",
        json={"name": "urgent"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    tag_id = tag.json()["id"]

    await client.post(
        "/api/tasks",
        json={"title": "Tagged task", "tag_ids": [tag_id]},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Untagged task"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks?tag_id={tag_id}",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Tagged task"


@pytest.mark.asyncio
async def test_filter_by_is_completed(client, auth_user1):
    t = await client.post(
        "/api/tasks",
        json={"title": "To complete"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.patch(
        f"/api/tasks/{t.json()['id']}/toggle",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Still active"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?is_completed=true",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "To complete"


@pytest.mark.asyncio
async def test_filter_by_due_date_range(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Due soon", "due_date": "2026-05-01"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Due later", "due_date": "2026-12-01"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "No due date"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?due_date_from=2026-04-01&due_date_to=2026-06-01",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Due soon"


@pytest.mark.asyncio
async def test_sort_by_title_asc(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Zebra task"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Alpha task"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?sort_by=title&sort_order=asc",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["title"] == "Alpha task"
    assert data["items"][1]["title"] == "Zebra task"


@pytest.mark.asyncio
async def test_sort_by_title_desc(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Alpha task"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Zebra task"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?sort_by=title&sort_order=desc",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["title"] == "Zebra task"
    assert data["items"][1]["title"] == "Alpha task"


@pytest.mark.asyncio
async def test_sort_by_due_date(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Later", "due_date": "2026-12-01"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Sooner", "due_date": "2026-05-01"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?sort_by=due_date&sort_order=asc",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["title"] == "Sooner"
    assert data["items"][1]["title"] == "Later"


@pytest.mark.asyncio
async def test_combined_filters(client, auth_user1):
    ctx = await client.post(
        "/api/contexts",
        json={"name": "Office"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    ctx_id = ctx.json()["id"]

    await client.post(
        "/api/tasks",
        json={
            "title": "Important report",
            "gtd_status": "next",
            "context_id": ctx_id,
            "due_date": "2026-05-15",
        },
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={
            "title": "Important report draft",
            "gtd_status": "inbox",
            "context_id": ctx_id,
            "due_date": "2026-05-10",
        },
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={
            "title": "Important call",
            "gtd_status": "next",
            "due_date": "2026-06-01",
        },
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        f"/api/tasks?gtd_status=next&context_id={ctx_id}&search=report",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Important report"


@pytest.mark.asyncio
async def test_search_case_insensitive(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Buy Groceries"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?search=groceries",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1

    response = await client.get(
        "/api/tasks?search=GROCERIES",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1


@pytest.mark.asyncio
async def test_search_in_description_and_notes(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Task A", "description": "secret keyword here"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task B", "notes": "another SECRET note"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task C"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?search=secret",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_search_with_sort_and_pagination(client, auth_user1):
    await client.post(
        "/api/tasks",
        json={"title": "Alpha search item"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Beta search item"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Gamma search item"},
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )

    response = await client.get(
        "/api/tasks?search=search&sort_by=title&sort_order=asc&limit=2&offset=0",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["items"][0]["title"] == "Alpha search item"
    assert data["items"][1]["title"] == "Beta search item"

    response = await client.get(
        "/api/tasks?search=search&sort_by=title&sort_order=asc&limit=2&offset=2",
        headers={"Authorization": f"Bearer {auth_user1['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Gamma search item"
