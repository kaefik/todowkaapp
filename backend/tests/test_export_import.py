import io
import json
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.user import User


@pytest_asyncio.fixture
async def auth_user(client, db_session):
    user_data = {
        "username": "exporter",
        "email": "exporter@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    await client.post(
        "/api/auth/login", json={"username": "exporter", "password": "Password123!"}
    )
    result = await db_session.execute(select(User).where(User.username == "exporter"))
    user = result.scalar_one()
    return {"user": user}


@pytest.mark.asyncio
async def test_export_requires_auth(client):
    response = await client.get("/api/export-import/export")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_import_requires_auth(client):
    data = json.dumps({
        "version": "1.0",
        "app": "todowka",
        "data": {
            "areas": [],
            "contexts": [],
            "tags": [],
            "verb_templates": [],
            "projects": [],
            "tasks": [],
            "checklist_items": [],
            "task_recurrences": [],
            "task_tags": [],
        },
    }).encode()
    response = await client.post(
        "/api/export-import/import",
        files={"file": ("import.json", io.BytesIO(data), "application/json")},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_export_empty_data(client, auth_user):
    response = await client.get("/api/export-import/export")
    assert response.status_code == 200
    body = response.json()
    assert "content" in body
    assert "filename" in body
    data = json.loads(body["content"])
    assert data["version"] == "1.0"
    assert data["app"] == "todowka"
    assert "data" in data
    for key in [
        "areas", "contexts", "tags", "verb_templates",
        "projects", "tasks", "checklist_items", "task_recurrences", "task_tags",
    ]:
        assert data["data"][key] == []


@pytest.mark.asyncio
async def test_export_with_tasks(client, auth_user):
    await client.post("/api/tasks", json={"title": "Task A"})
    await client.post("/api/tasks", json={"title": "Task B"})

    response = await client.get("/api/export-import/export")
    assert response.status_code == 200
    data = json.loads(response.json()["content"])
    tasks = data["data"]["tasks"]
    assert len(tasks) == 2
    titles = {t["title"] for t in tasks}
    assert titles == {"Task A", "Task B"}


@pytest.mark.asyncio
async def test_export_with_related_data(client, auth_user):
    tag_resp = await client.post(
        "/api/tags", json={"name": "urgent", "color": "#FF0000"}
    )
    tag_id = tag_resp.json()["id"]

    ctx_resp = await client.post(
        "/api/contexts", json={"name": "Office"}
    )
    ctx_id = ctx_resp.json()["id"]

    area_resp = await client.post(
        "/api/areas", json={"name": "Work"}
    )
    area_id = area_resp.json()["id"]

    proj_resp = await client.post(
        "/api/projects", json={"name": "Project X", "area_id": area_id}
    )
    proj_id = proj_resp.json()["id"]

    await client.post(
        "/api/tasks",
        json={
            "title": "Full task",
            "context_id": ctx_id,
            "area_id": area_id,
            "project_id": proj_id,
            "tag_ids": [tag_id],
        },
    )

    response = await client.get("/api/export-import/export")
    assert response.status_code == 200
    data = json.loads(response.json()["content"])

    assert len(data["data"]["tags"]) == 1
    assert data["data"]["tags"][0]["id"] == tag_id
    assert len(data["data"]["contexts"]) == 1
    assert data["data"]["contexts"][0]["id"] == ctx_id
    assert len(data["data"]["areas"]) == 1
    assert data["data"]["areas"][0]["id"] == area_id
    assert len(data["data"]["projects"]) == 1
    assert data["data"]["projects"][0]["id"] == proj_id
    assert len(data["data"]["tasks"]) == 1
    task = data["data"]["tasks"][0]
    assert task["title"] == "Full task"
    assert tag_id in task["tag_ids"]
    assert len(data["data"]["task_tags"]) == 1
    assert data["data"]["task_tags"][0]["tag_id"] == tag_id


@pytest.mark.asyncio
async def test_import_creates_new_data(client, auth_user):
    tag_id = "aaaaaaaa-0000-0000-0000-000000000001"
    task_id = "aaaaaaaa-0000-0000-0000-000000000002"
    import_payload = {
        "version": "1.0",
        "app": "todowka",
        "exported_at": datetime.now(UTC).isoformat(),
        "data": {
            "areas": [],
            "contexts": [],
            "tags": [
                {"id": tag_id, "name": "imported-tag", "color": "#00FF00"},
            ],
            "verb_templates": [],
            "projects": [],
            "tasks": [
                {"id": task_id, "title": "Imported task", "tag_ids": [tag_id]},
            ],
            "checklist_items": [],
            "task_recurrences": [],
            "task_tags": [
                {"task_id": task_id, "tag_id": tag_id},
            ],
        },
    }
    json_bytes = json.dumps(import_payload).encode()

    response = await client.post(
        "/api/export-import/import",
        files={"file": ("import.json", io.BytesIO(json_bytes), "application/json")},
    )
    assert response.status_code == 200
    report = response.json()
    assert report["imported"]["tags"] == 1
    assert report["imported"]["tasks"] == 1
    assert report["imported"]["task_tags"] == 1
    assert report["skipped"] == 0

    task_resp = await client.get(f"/api/tasks/{task_id}")
    assert task_resp.status_code == 200
    assert task_resp.json()["title"] == "Imported task"


@pytest.mark.asyncio
async def test_import_rejects_invalid_json(client, auth_user):
    bad_bytes = b"this is not json at all"

    response = await client.post(
        "/api/export-import/import",
        files={"file": ("import.json", io.BytesIO(bad_bytes), "application/json")},
    )
    assert response.status_code == 400
    assert "Invalid JSON" in response.json()["detail"]


@pytest.mark.asyncio
async def test_import_rejects_wrong_app(client, auth_user):
    payload = json.dumps({
        "version": "1.0",
        "app": "not-todowka",
        "data": {},
    }).encode()

    response = await client.post(
        "/api/export-import/import",
        files={"file": ("import.json", io.BytesIO(payload), "application/json")},
    )
    assert response.status_code == 400
    assert "unsupported app" in response.json()["detail"]


@pytest.mark.asyncio
async def test_import_upsert_updates_existing(client, auth_user):
    create_resp = await client.post(
        "/api/tasks", json={"title": "Original Title"}
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    import_payload = {
        "version": "1.0",
        "app": "todowka",
        "exported_at": datetime.now(UTC).isoformat(),
        "data": {
            "areas": [],
            "contexts": [],
            "tags": [],
            "verb_templates": [],
            "projects": [],
            "tasks": [
                {
                    "id": task_id,
                    "title": "Updated Via Import",
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            ],
            "checklist_items": [],
            "task_recurrences": [],
            "task_tags": [],
        },
    }
    json_bytes = json.dumps(import_payload).encode()

    response = await client.post(
        "/api/export-import/import",
        files={"file": ("import.json", io.BytesIO(json_bytes), "application/json")},
    )
    assert response.status_code == 200
    assert response.json()["imported"]["tasks"] == 1

    verify_resp = await client.get(f"/api/tasks/{task_id}")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["title"] == "Updated Via Import"


@pytest.mark.asyncio
async def test_cross_user_import_creates_with_new_ids(client, auth_user, db_session):
    await client.post("/api/tags", json={"name": "work", "color": "#FF0000"})
    await client.post("/api/contexts", json={"name": "Office"})
    await client.post("/api/areas", json={"name": "Work"})
    await client.post("/api/projects", json={"name": "Proj A"})
    await client.post("/api/tasks", json={"title": "Task from user A"})

    export_resp = await client.get("/api/export-import/export")
    assert export_resp.status_code == 200
    export_content = export_resp.json()["content"]

    user_b_data = {
        "username": "importer",
        "email": "importer@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_b_data)
    await client.post(
        "/api/auth/login",
        json={"username": "importer", "password": "Password123!"},
    )

    json_bytes = export_content.encode()
    import_resp = await client.post(
        "/api/export-import/import",
        files={"file": ("import.json", io.BytesIO(json_bytes), "application/json")},
    )
    assert import_resp.status_code == 200
    report = import_resp.json()
    assert report["imported"]["tasks"] >= 1
    assert report["imported"]["tags"] >= 1
    assert report["imported"]["areas"] >= 1
    assert report["imported"]["projects"] >= 1

    tasks_resp = await client.get("/api/tasks")
    user_b_tasks = tasks_resp.json()["items"]
    assert any(t["title"] == "Task from user A" for t in user_b_tasks)
