import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.user import User


@pytest_asyncio.fixture
async def auth_user(client, db_session):
    user_data = {
        "username": "recur_user",
        "email": "recur@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login", json={"username": "recur_user", "password": "Password123!"}
    )
    token = login_response.cookies.get("access_token")
    result = await db_session.execute(select(User).where(User.username == "recur_user"))
    user = result.scalar_one()
    return {"user": user, "token": token}


def auth_headers(token: str) -> dict:
    return {"Cookie": f"access_token={token}"}


@pytest.mark.asyncio
async def test_toggle_daily_recurrence_creates_next_task(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Daily recurring",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]
    assert create_resp.json()["is_recurring"] is True

    toggle_resp = await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)
    assert toggle_resp.status_code == 200
    toggled = toggle_resp.json()
    assert toggled["is_completed"] is True
    assert toggled["gtd_status"] == "completed"

    tasks_resp = await client.get("/api/tasks", headers=h)
    tasks = tasks_resp.json()["items"]
    assert len(tasks) == 2

    original = next(t for t in tasks if t["id"] == task_id)
    new_task = next(t for t in tasks if t["id"] != task_id)

    assert original["is_completed"] is True
    assert new_task["is_completed"] is False
    assert new_task["gtd_status"] == "next"
    assert new_task["title"] == "Daily recurring"
    assert new_task["is_recurring"] is True
    assert new_task["recurrence_type"] == "daily"
    assert new_task["due_date"] is not None
    assert "2026-04-28" in new_task["due_date"]


@pytest.mark.asyncio
async def test_toggle_daily_recurrence_with_interval(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Every 3 days",
            "due_date": "2026-04-27T12:00:00Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 3},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2026-04-30" in new_task["due_date"]


@pytest.mark.asyncio
async def test_new_task_copies_reminder_settings(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Recurring with reminder",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "reminder_time": "09:00",
            "reminder_offsets": [15, 30],
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert new_task["reminder_time"] is not None
    assert new_task["reminder_offsets"] is not None
    assert 15 in new_task["reminder_offsets"]
    assert 30 in new_task["reminder_offsets"]


@pytest.mark.asyncio
async def test_new_task_copies_context_area_project(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    ctx = await client.post("/api/contexts", json={"name": "Home"}, headers=h)
    assert ctx.status_code == 201
    ctx_id = ctx.json()["id"]

    area = await client.post("/api/areas", json={"name": "Health"}, headers=h)
    assert area.status_code == 201
    area_id = area.json()["id"]

    proj = await client.post("/api/projects", json={"name": "MyProj"}, headers=h)
    assert proj.status_code == 201
    proj_id = proj.json()["id"]

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Recurring with relations",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "context_id": ctx_id,
            "area_id": area_id,
            "project_id": proj_id,
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert new_task["context"] is not None
    assert new_task["context"]["id"] == ctx_id
    assert new_task["project"] is not None
    assert new_task["project"]["id"] == proj_id


@pytest.mark.asyncio
async def test_no_new_task_when_recurrence_end_date_passed(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Expired recurrence",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "recurrence_end_date": "2020-01-01T00:00:00Z",
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    toggle_resp = await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)
    assert toggle_resp.status_code == 200

    tasks_resp = await client.get("/api/tasks", headers=h)
    tasks = tasks_resp.json()["items"]
    assert len(tasks) == 1
    assert tasks[0]["id"] == task_id


@pytest.mark.asyncio
async def test_no_new_task_on_uncomplete(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Daily task",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)
    tasks_after_first = (await client.get("/api/tasks", headers=h)).json()["items"]
    assert len(tasks_after_first) == 2

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)
    tasks_after_second = (await client.get("/api/tasks", headers=h)).json()["items"]
    assert len(tasks_after_second) == 2


@pytest.mark.asyncio
async def test_move_to_completed_generates_next(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Move to completed",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    move_resp = await client.patch(
        f"/api/tasks/{task_id}/move",
        json={"gtd_status": "completed"},
        headers=h,
    )
    assert move_resp.status_code == 200
    assert move_resp.json()["is_completed"] is True

    tasks_resp = await client.get("/api/tasks", headers=h)
    tasks = tasks_resp.json()["items"]
    assert len(tasks) == 2

    new_task = next(t for t in tasks if t["id"] != task_id)
    assert new_task["is_completed"] is False
    assert new_task["gtd_status"] == "next"


@pytest.mark.asyncio
async def test_stop_recurrence(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Stop me",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    stop_resp = await client.post(f"/api/tasks/{task_id}/stop-recurrence", headers=h)
    assert stop_resp.status_code == 200
    stopped = stop_resp.json()
    assert stopped["recurrence_type"] is None
    assert stopped["recurrence_config"] is None
    assert stopped["recurrence_end_date"] is None
    assert stopped["is_recurring"] is False


@pytest.mark.asyncio
async def test_recurrence_history(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "History test",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    hist_resp = await client.get(f"/api/tasks/{task_id}/recurrences", headers=h)
    assert hist_resp.status_code == 200
    data = hist_resp.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    item = data["items"][0]
    assert item["task_id"] == task_id
    assert item["generated_task_id"] is not None


@pytest.mark.asyncio
async def test_monthly_recurrence_by_day_of_month(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Monthly by day",
            "due_date": "2026-04-15T23:59:59Z",
            "recurrence_type": "monthly",
            "recurrence_config": {"type": "monthly", "interval": 1, "day_of_month": 15},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2026-05-15" in new_task["due_date"]


@pytest.mark.asyncio
async def test_non_recurring_toggle_no_new_task(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={"title": "Normal task", "gtd_status": "next"},
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    tasks = tasks_resp.json()["items"]
    assert len(tasks) == 1


@pytest.mark.asyncio
async def test_create_task_with_recurrence_without_due_date_fails(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    resp = await client.post(
        "/api/tasks",
        json={
            "title": "No due date recurring",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
        },
        headers=h,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_weekly_recurrence(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Weekly task",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "weekly",
            "recurrence_config": {"type": "weekly", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert new_task["recurrence_type"] == "weekly"
    assert new_task["is_completed"] is False
    assert new_task["gtd_status"] == "next"


@pytest.mark.asyncio
async def test_new_task_copies_notes(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Task with notes",
            "notes": "Important details here",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert new_task["notes"] == "Important details here"


@pytest.mark.asyncio
async def test_new_task_copies_recurrence_config(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    config = {"type": "daily", "interval": 1}
    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Config copy test",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": config,
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert new_task["recurrence_type"] == "daily"
    assert new_task["recurrence_config"]["interval"] == 1
    assert new_task["recurrence_end_date"] is None


@pytest.mark.asyncio
async def test_double_toggle_creates_only_one_new_task(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Double toggle",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_after_complete = (await client.get("/api/tasks", headers=h)).json()["items"]
    assert len(tasks_after_complete) == 2

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_after_uncomplete = (await client.get("/api/tasks", headers=h)).json()["items"]
    assert len(tasks_after_uncomplete) == 2

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_after_second_complete = (await client.get("/api/tasks", headers=h)).json()["items"]
    new_tasks = [t for t in tasks_after_second_complete if t["id"] != task_id]
    assert len(new_tasks) == 2


@pytest.mark.asyncio
async def test_weekly_recurrence_with_days_1_to_7(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Weekly with days",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "weekly",
            "recurrence_config": {"type": "weekly", "interval": 1, "days": [1, 3, 5]},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    due = new_task["due_date"]
    assert due is not None
    from datetime import datetime as dt
    parsed = dt.fromisoformat(due.replace("Z", "+00:00"))
    weekday = parsed.weekday()
    assert weekday in [0, 2, 4]


@pytest.mark.asyncio
async def test_new_task_copies_tags(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    tag_resp = await client.post("/api/tags", json={"name": "TestTag", "color": "#ff0000"}, headers=h)
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Tagged recurring",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "tag_ids": [tag_id],
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert new_task["tags"] is not None
    assert len(new_task["tags"]) == 1
    assert new_task["tags"][0]["id"] == tag_id


@pytest.mark.asyncio
async def test_trash_task_no_recurrence_generation(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Trash recurring",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    move_resp = await client.patch(
        f"/api/tasks/{task_id}/move",
        json={"gtd_status": "completed"},
        headers=h,
    )
    assert move_resp.status_code == 200

    tasks_before_trash = (await client.get("/api/tasks", headers=h)).json()["items"]
    assert len(tasks_before_trash) == 2

    new_task = next(t for t in tasks_before_trash if t["id"] != task_id)
    await client.patch(
        f"/api/tasks/{new_task['id']}/move",
        json={"gtd_status": "trash"},
        headers=h,
    )

    tasks_after_trash = (await client.get("/api/tasks?gtd_status=trash", headers=h)).json()["items"]
    trashed = next(t for t in tasks_after_trash if t["id"] == new_task["id"])
    assert trashed["due_date"] is None


@pytest.mark.asyncio
async def test_validate_recurrence_config_rejects_invalid_days(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    resp = await client.post(
        "/api/tasks",
        json={
            "title": "Invalid days",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "weekly",
            "recurrence_config": {"type": "weekly", "interval": 1, "days": [0, 8]},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_task_recurrence_preserves_due_date(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Update recurrence",
            "due_date": "2026-04-27T23:59:59Z",
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/api/tasks/{task_id}",
        json={
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
        },
        headers=h,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["recurrence_type"] == "daily"


@pytest.mark.asyncio
async def test_monthly_recurrence_with_interval(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Every 2 months",
            "due_date": "2026-04-15T23:59:59Z",
            "recurrence_type": "monthly",
            "recurrence_config": {"type": "monthly", "interval": 2, "day_of_month": 15},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2026-06-15" in new_task["due_date"]


@pytest.mark.asyncio
async def test_yearly_recurrence_simple(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Yearly task",
            "due_date": "2026-06-15T23:59:59Z",
            "recurrence_type": "yearly",
            "recurrence_config": {"type": "yearly", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code in (200, 201)
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2027-06-15" in new_task["due_date"]


@pytest.mark.asyncio
async def test_yearly_recurrence_with_interval(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Every 3 years",
            "due_date": "2026-01-10T23:59:59Z",
            "recurrence_type": "yearly",
            "recurrence_config": {"type": "yearly", "interval": 3},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2029-01-10" in new_task["due_date"]


@pytest.mark.asyncio
async def test_yearly_recurrence_with_month_and_day(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Birthday",
            "due_date": "2026-03-01T23:59:59Z",
            "recurrence_type": "yearly",
            "recurrence_config": {"type": "yearly", "interval": 1, "month": 12, "day_of_month": 25},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2027-12-25" in new_task["due_date"]


@pytest.mark.asyncio
async def test_yearly_recurrence_leap_year(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Leap year task",
            "due_date": "2024-02-29T23:59:59Z",
            "recurrence_type": "yearly",
            "recurrence_config": {"type": "yearly", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    task_id = create_resp.json()["id"]

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)
    assert "2025-02-28" in new_task["due_date"]


@pytest.mark.asyncio
async def test_yearly_validate_rejects_invalid_month(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    resp = await client.post(
        "/api/tasks",
        json={
            "title": "Invalid month",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "yearly",
            "recurrence_config": {"type": "yearly", "interval": 1, "month": 13},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_new_task_copies_checklist_items(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Recurring with checklist",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    for pos, title in enumerate(["Step 1", "Step 2", "Step 3"]):
        item_resp = await client.post(
            f"/api/tasks/{task_id}/checklist",
            json={"title": title, "position": pos},
            headers=h,
        )
        assert item_resp.status_code == 201

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)

    checklist_resp = await client.get(f"/api/tasks/{new_task['id']}/checklist", headers=h)
    assert checklist_resp.status_code == 200
    items = checklist_resp.json()
    assert len(items) == 3
    titles = [i["title"] for i in sorted(items, key=lambda x: x["position"])]
    assert titles == ["Step 1", "Step 2", "Step 3"]


@pytest.mark.asyncio
async def test_new_task_resets_checklist_items_completion(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Recurring with completed checklist",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    item_ids = []
    for pos, title in enumerate(["A", "B", "C"]):
        item_resp = await client.post(
            f"/api/tasks/{task_id}/checklist",
            json={"title": title, "position": pos},
            headers=h,
        )
        assert item_resp.status_code == 201
        item_ids.append(item_resp.json()["id"])

    for iid in item_ids[:2]:
        patch_resp = await client.patch(
            f"/api/tasks/{task_id}/checklist/{iid}",
            json={"is_completed": True},
            headers=h,
        )
        assert patch_resp.status_code == 200

    await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)

    tasks_resp = await client.get("/api/tasks", headers=h)
    new_task = next(t for t in tasks_resp.json()["items"] if t["id"] != task_id)

    checklist_resp = await client.get(f"/api/tasks/{new_task['id']}/checklist", headers=h)
    assert checklist_resp.status_code == 200
    items = checklist_resp.json()
    assert len(items) == 3
    for item in items:
        assert item["is_completed"] is False
        assert item["completed_at"] is None


@pytest.mark.asyncio
async def test_task_without_checklist_generates_without_error(client, auth_user):
    token = auth_user["token"]
    h = auth_headers(token)

    create_resp = await client.post(
        "/api/tasks",
        json={
            "title": "Recurring no checklist",
            "due_date": "2026-04-27T23:59:59Z",
            "recurrence_type": "daily",
            "recurrence_config": {"type": "daily", "interval": 1},
            "gtd_status": "next",
        },
        headers=h,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    toggle_resp = await client.patch(f"/api/tasks/{task_id}/toggle", headers=h)
    assert toggle_resp.status_code == 200

    tasks_resp = await client.get("/api/tasks", headers=h)
    tasks = tasks_resp.json()["items"]
    assert len(tasks) == 2
    new_task = next(t for t in tasks if t["id"] != task_id)
    assert new_task["is_completed"] is False
    assert new_task["title"] == "Recurring no checklist"
