# Export/Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON export/import for all user data (areas, contexts, tags, verb_templates, projects, tasks, checklist_items, task_recurrences, task_tags).

**Architecture:** New ExportImportService on backend handles serialization/deserialization. Two API endpoints (GET /api/export, POST /api/import). Frontend adds buttons in Settings "Data Management" section. Offline fallback via Dexie.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), React/TypeScript (frontend)

**Spec:** `docs/superpowers/specs/2026-04-29-export-import-design.md`

---

### Task 1: Backend — ExportImportService (export)

**Files:**
- Create: `backend/app/services/export_import_service.py`

- [ ] **Step 1: Create ExportImportService with export_data method**

```python
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area
from app.models.checklist import ChecklistItem
from app.models.context import Context
from app.models.project import Project
from app.models.tag import Tag, task_tags
from app.models.task import Task
from app.models.task_recurrence import TaskRecurrence
from app.models.verb_template import VerbTemplate


class ExportImportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _serialize_datetime(self, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    def _serialize_time(self, value: Any) -> str | None:
        if value is None:
            return None
        return str(value)

    def _serialize_task(self, task: Task) -> dict:
        data = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "is_completed": task.is_completed,
            "completed_at": self._serialize_datetime(task.completed_at),
            "gtd_status": task.gtd_status,
            "context_id": task.context_id,
            "area_id": task.area_id,
            "project_id": task.project_id,
            "position": task.position,
            "due_date": self._serialize_datetime(task.due_date),
            "notes": task.notes,
            "recurrence_type": task.recurrence_type,
            "recurrence_config": task.recurrence_config,
            "recurrence_end_date": self._serialize_datetime(task.recurrence_end_date),
            "reminder_time": self._serialize_time(task.reminder_time),
            "reminder_offsets": task.reminder_offsets,
            "reminder_fired": task.reminder_fired,
            "deadline_notified": task.deadline_notified,
            "trashed_at": self._serialize_datetime(task.trashed_at),
            "created_at": self._serialize_datetime(task.created_at),
            "updated_at": self._serialize_datetime(task.updated_at),
            "tag_ids": [tag.id for tag in task.tags] if task.tags else [],
        }
        return data

    def _serialize_entity(self, entity: Any, fields: list[str]) -> dict:
        data = {}
        for field in fields:
            value = getattr(entity, field, None)
            if isinstance(value, datetime):
                data[field] = self._serialize_datetime(value)
            else:
                data[field] = value
        return data

    async def export_data(self, user_id: str) -> dict:
        result_tasks = await self.db.execute(
            select(Task).where(Task.user_id == user_id)
        )
        tasks = result_tasks.scalars().all()
        task_ids = [t.id for t in tasks]

        result_areas = await self.db.execute(
            select(Area).where(Area.user_id == user_id)
        )
        areas = result_areas.scalars().all()

        result_contexts = await self.db.execute(
            select(Context).where(Context.user_id == user_id)
        )
        contexts = result_contexts.scalars().all()

        result_tags = await self.db.execute(
            select(Tag).where(Tag.user_id == user_id)
        )
        tags = result_tags.scalars().all()

        result_projects = await self.db.execute(
            select(Project).where(Project.user_id == user_id)
        )
        projects = result_projects.scalars().all()

        result_checklist = await self.db.execute(
            select(ChecklistItem).where(ChecklistItem.task_id.in_(task_ids))
        )
        checklist_items = result_checklist.scalars().all()

        result_recurrences = await self.db.execute(
            select(TaskRecurrence).where(TaskRecurrence.task_id.in_(task_ids))
        )
        task_recurrences = result_recurrences.scalars().all()

        result_verb_templates = await self.db.execute(
            select(VerbTemplate).where(VerbTemplate.user_id == user_id)
        )
        verb_templates = result_verb_templates.scalars().all()

        serialized_task_tags = []
        if task_ids:
            tag_ids_set = {t.id for t in tags}
            for task in tasks:
                if task.tags:
                    for tag in task.tags:
                        if tag.id in tag_ids_set:
                            serialized_task_tags.append({
                                "task_id": task.id,
                                "tag_id": tag.id,
                            })

        return {
            "version": "1.0",
            "app": "todowka",
            "exported_at": datetime.now(UTC).isoformat(),
            "data": {
                "areas": [
                    self._serialize_entity(a, ["id", "name", "description", "color", "sort_order", "created_at", "updated_at"])
                    for a in areas
                ],
                "contexts": [
                    self._serialize_entity(c, ["id", "name", "color", "icon", "created_at", "updated_at"])
                    for c in contexts
                ],
                "tags": [
                    self._serialize_entity(t, ["id", "name", "color", "created_at", "updated_at"])
                    for t in tags
                ],
                "verb_templates": [
                    self._serialize_entity(v, ["id", "text", "icon", "position", "created_at", "updated_at"])
                    for v in verb_templates
                ],
                "projects": [
                    self._serialize_entity(p, ["id", "area_id", "name", "description", "color", "is_active", "sort_order", "created_at", "updated_at"])
                    for p in projects
                ],
                "tasks": [self._serialize_task(t) for t in tasks],
                "checklist_items": [
                    self._serialize_entity(ci, ["id", "task_id", "title", "is_completed", "position", "completed_at", "created_at", "updated_at"])
                    for ci in checklist_items
                ],
                "task_recurrences": [
                    self._serialize_entity(tr, ["id", "task_id", "generated_task_id", "due_date_of_generated_task", "generated_at", "status"])
                    for tr in task_recurrences
                ],
                "task_tags": serialized_task_tags,
            },
        }
```

- [ ] **Step 2: Run ruff check on the new file**

Run: `cd backend && ruff check app/services/export_import_service.py`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/export_import_service.py
git commit -m "feat: add ExportImportService with export_data method"
```

---

### Task 2: Backend — ExportImportService (import)

**Files:**
- Modify: `backend/app/services/export_import_service.py`

- [ ] **Step 1: Add import_data method to ExportImportService**

Append the following to `export_import_service.py`, after the `export_data` method:

```python
    async def import_data(self, user_id: str, import_data: dict) -> dict:
        errors: list[str] = []
        imported: dict[str, int] = {
            "areas": 0,
            "contexts": 0,
            "tags": 0,
            "verb_templates": 0,
            "projects": 0,
            "tasks": 0,
            "checklist_items": 0,
            "task_recurrences": 0,
            "task_tags": 0,
        }
        skipped = 0

        data = import_data.get("data", {})

        area_ids = await self._import_simple_entities(
            user_id, data.get("areas", []), Area,
            ["name", "description", "color", "sort_order", "created_at", "updated_at"],
            imported, "areas", errors,
        )
        context_ids = await self._import_simple_entities(
            user_id, data.get("contexts", []), Context,
            ["name", "color", "icon", "created_at", "updated_at"],
            imported, "contexts", errors,
        )
        tag_ids = await self._import_simple_entities(
            user_id, data.get("tags", []), Tag,
            ["name", "color", "created_at", "updated_at"],
            imported, "tags", errors,
        )
        verb_template_ids = await self._import_simple_entities(
            user_id, data.get("verb_templates", []), VerbTemplate,
            ["text", "icon", "position", "created_at", "updated_at"],
            imported, "verb_templates", errors,
        )

        project_ids: set[str] = set()
        for item in data.get("projects", []):
            try:
                area_id = item.get("area_id")
                if area_id and area_id not in area_ids:
                    area_id = None

                existing = await self.db.get(Project, item["id"])
                if existing and existing.user_id == user_id:
                    for field in ["name", "description", "color", "is_active", "sort_order"]:
                        if field in item:
                            setattr(existing, field, item[field])
                    existing.area_id = area_id
                    self._set_datetime_fields(existing, item, ["created_at", "updated_at"])
                elif not existing:
                    new = Project(
                        id=item["id"],
                        user_id=user_id,
                        area_id=area_id,
                        name=item.get("name", ""),
                        description=item.get("description"),
                        color=item.get("color"),
                        is_active=item.get("is_active", True),
                        sort_order=item.get("sort_order", 0),
                        created_at=self._parse_datetime(item.get("created_at")),
                        updated_at=self._parse_datetime(item.get("updated_at")),
                    )
                    self.db.add(new)
                else:
                    skipped += 1
                    continue
                project_ids.add(item["id"])
                imported["projects"] += 1
            except Exception as e:
                errors.append(f"Project {item.get('id', '?')}: {e}")
        await self.db.flush()

        task_ids_imported: set[str] = set()
        for item in data.get("tasks", []):
            try:
                context_id = item.get("context_id")
                if context_id and context_id not in context_ids:
                    context_id = None
                area_id = item.get("area_id")
                if area_id and area_id not in area_ids:
                    area_id = None
                project_id = item.get("project_id")
                if project_id and project_id not in project_ids:
                    project_id = None

                existing = await self.db.get(Task, item["id"])
                task_fields = [
                    "title", "description", "is_completed", "gtd_status",
                    "position", "notes", "recurrence_type", "recurrence_config",
                    "reminder_offsets", "reminder_fired", "deadline_notified",
                ]
                if existing and existing.user_id == user_id:
                    for field in task_fields:
                        if field in item:
                            setattr(existing, field, item[field])
                    existing.context_id = context_id
                    existing.area_id = area_id
                    existing.project_id = project_id
                    existing.completed_at = self._parse_datetime(item.get("completed_at"))
                    existing.due_date = self._parse_datetime(item.get("due_date"))
                    existing.recurrence_end_date = self._parse_datetime(item.get("recurrence_end_date"))
                    existing.reminder_time = item.get("reminder_time")
                    existing.trashed_at = self._parse_datetime(item.get("trashed_at"))
                    existing.updated_at = self._parse_datetime(item.get("updated_at"))
                elif not existing:
                    new = Task(
                        id=item["id"],
                        user_id=user_id,
                        title=item.get("title", ""),
                        description=item.get("description"),
                        is_completed=item.get("is_completed", False),
                        completed_at=self._parse_datetime(item.get("completed_at")),
                        gtd_status=item.get("gtd_status", "inbox"),
                        context_id=context_id,
                        area_id=area_id,
                        project_id=project_id,
                        position=item.get("position", 0),
                        due_date=self._parse_datetime(item.get("due_date")),
                        notes=item.get("notes"),
                        recurrence_type=item.get("recurrence_type"),
                        recurrence_config=item.get("recurrence_config"),
                        recurrence_end_date=self._parse_datetime(item.get("recurrence_end_date")),
                        reminder_time=item.get("reminder_time"),
                        reminder_offsets=item.get("reminder_offsets"),
                        reminder_fired=item.get("reminder_fired", False),
                        deadline_notified=item.get("deadline_notified", False),
                        trashed_at=self._parse_datetime(item.get("trashed_at")),
                        created_at=self._parse_datetime(item.get("created_at")),
                        updated_at=self._parse_datetime(item.get("updated_at")),
                    )
                    self.db.add(new)
                else:
                    skipped += 1
                    continue
                task_ids_imported.add(item["id"])
                imported["tasks"] += 1
            except Exception as e:
                errors.append(f"Task {item.get('id', '?')}: {e}")
        await self.db.flush()

        for item in data.get("checklist_items", []):
            try:
                if item.get("task_id") not in task_ids_imported:
                    skipped += 1
                    continue
                existing = await self.db.get(ChecklistItem, item["id"])
                if existing:
                    for field in ["title", "is_completed", "position"]:
                        if field in item:
                            setattr(existing, field, item[field])
                    existing.completed_at = self._parse_datetime(item.get("completed_at"))
                    existing.updated_at = self._parse_datetime(item.get("updated_at"))
                else:
                    new = ChecklistItem(
                        id=item["id"],
                        task_id=item["task_id"],
                        title=item.get("title", ""),
                        is_completed=item.get("is_completed", False),
                        position=item.get("position", 0),
                        completed_at=self._parse_datetime(item.get("completed_at")),
                        created_at=self._parse_datetime(item.get("created_at")),
                        updated_at=self._parse_datetime(item.get("updated_at")),
                    )
                    self.db.add(new)
                imported["checklist_items"] += 1
            except Exception as e:
                errors.append(f"ChecklistItem {item.get('id', '?')}: {e}")
        await self.db.flush()

        for item in data.get("task_recurrences", []):
            try:
                if item.get("task_id") not in task_ids_imported:
                    skipped += 1
                    continue
                if item.get("generated_task_id") not in task_ids_imported:
                    skipped += 1
                    continue
                existing = await self.db.get(TaskRecurrence, item["id"])
                if existing:
                    existing.due_date_of_generated_task = self._parse_datetime(item.get("due_date_of_generated_task"))
                    existing.generated_at = self._parse_datetime(item.get("generated_at"))
                    existing.status = item.get("status", "completed")
                else:
                    new = TaskRecurrence(
                        id=item["id"],
                        task_id=item["task_id"],
                        generated_task_id=item["generated_task_id"],
                        due_date_of_generated_task=self._parse_datetime(item.get("due_date_of_generated_task")),
                        generated_at=self._parse_datetime(item.get("generated_at")),
                        status=item.get("status", "completed"),
                    )
                    self.db.add(new)
                imported["task_recurrences"] += 1
            except Exception as e:
                errors.append(f"TaskRecurrence {item.get('id', '?')}: {e}")
        await self.db.flush()

        for item in data.get("task_tags", []):
            try:
                if item.get("task_id") not in task_ids_imported:
                    skipped += 1
                    continue
                if item.get("tag_id") not in tag_ids:
                    skipped += 1
                    continue
                result = await self.db.execute(
                    select(task_tags).where(
                        task_tags.c.task_id == item["task_id"],
                        task_tags.c.tag_id == item["tag_id"],
                    )
                )
                if result.first() is None:
                    await self.db.execute(
                        task_tags.insert().values(
                            task_id=item["task_id"],
                            tag_id=item["tag_id"],
                        )
                    )
                imported["task_tags"] += 1
            except Exception as e:
                errors.append(f"TaskTag {item.get('task_id', '?')}/{item.get('tag_id', '?')}: {e}")
        await self.db.flush()

        return {
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
        }

    async def _import_simple_entities(
        self,
        user_id: str,
        items: list[dict],
        model_class: type,
        fields: list[str],
        imported: dict,
        key: str,
        errors: list[str],
    ) -> set[str]:
        imported_ids: set[str] = set()
        for item in items:
            try:
                existing = await self.db.get(model_class, item["id"])
                if existing and getattr(existing, "user_id", None) == user_id:
                    for field in fields:
                        if field in item and field not in ("id", "user_id"):
                            setattr(existing, field, item[field])
                elif not existing:
                    kwargs = {"id": item["id"], "user_id": user_id}
                    for field in fields:
                        if field not in ("id", "user_id") and field in item:
                            kwargs[field] = item[field]
                    new = model_class(**kwargs)
                    self.db.add(new)
                else:
                    continue
                imported_ids.add(item["id"])
                imported[key] += 1
            except Exception as e:
                errors.append(f"{model_class.__name__} {item.get('id', '?')}: {e}")
        await self.db.flush()
        return imported_ids

    def _parse_datetime(self, value: str | None) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value)
        except (ValueError, TypeError):
            return None

    def _set_datetime_fields(self, obj: Any, item: dict, fields: list[str]) -> None:
        for field in fields:
            if field in item:
                setattr(obj, field, self._parse_datetime(item[field]))
```

- [ ] **Step 2: Run ruff check**

Run: `cd backend && ruff check app/services/export_import_service.py`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/export_import_service.py
git commit -m "feat: add import_data method to ExportImportService"
```

---

### Task 3: Backend — Pydantic schemas for export/import

**Files:**
- Create: `backend/app/schemas/export_import.py`

- [ ] **Step 1: Create schemas**

```python
from pydantic import BaseModel


class ImportReport(BaseModel):
    imported: dict[str, int]
    skipped: int
    errors: list[str]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/export_import.py
git commit -m "feat: add ImportReport schema"
```

---

### Task 4: Backend — API router for export/import

**Files:**
- Create: `backend/app/api/export_import.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

```python
import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.export_import import ImportReport
from app.services.export_import_service import ExportImportService

export_import_router = APIRouter(prefix="/export-import", tags=["export-import"])

MAX_FILE_SIZE = 50 * 1024 * 1024


@export_import_router.get("/export")
async def export_data(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ExportImportService(db)
    data = await service.export_data(user_id=current_user.id)
    filename = f"todowka_export_{datetime.now(UTC).strftime('%Y-%m-%d')}.json"
    content = json.dumps(data, ensure_ascii=False, indent=2)
    return {
        "content": content,
        "filename": filename,
    }


@export_import_router.post("/import", response_model=ImportReport)
async def import_data(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile,
):
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .json files are accepted",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB",
        )

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON file",
        )

    if data.get("app") != "todowka":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format: 'app' must be 'todowka'",
        )

    if data.get("version") != "1.0":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported version. Only version '1.0' is supported",
        )

    if "data" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format: missing 'data' field",
        )

    service = ExportImportService(db)
    report = await service.import_data(user_id=current_user.id, import_data=data)
    return ImportReport(**report)
```

- [ ] **Step 2: Register router in main.py**

In `backend/app/main.py`, add the import at the top with the other router imports:

```python
from app.api.export_import import export_import_router
```

And add the router registration after the existing ones (line ~91):

```python
    api_router.include_router(export_import_router)
```

- [ ] **Step 3: Run ruff check**

Run: `cd backend && ruff check app/api/export_import.py app/main.py`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/export_import.py backend/app/main.py
git commit -m "feat: add export/import API endpoints"
```

---

### Task 5: Backend — Tests for export/import

**Files:**
- Create: `backend/tests/test_export_import.py`

- [ ] **Step 1: Write tests**

```python
import json

import pytest
import pytest_asyncio


@pytest_asyncio.fixture
async def auth_user(client, db_session):
    from sqlalchemy import select

    from app.models.user import User

    user_data = {
        "username": "exportuser",
        "email": "export@example.com",
        "password": "Password123!",
    }
    await client.post("/api/auth/register", json=user_data)
    login_response = await client.post(
        "/api/auth/login", json={"username": "exportuser", "password": "Password123!"}
    )
    token = login_response.json()["access_token"]
    result = await db_session.execute(select(User).where(User.username == "exportuser"))
    user = result.scalar_one()
    return {"user": user, "token": token}


@pytest.mark.asyncio
async def test_export_empty_data(client, auth_user):
    response = await client.get(
        "/api/export-import/export",
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 200
    data = response.json()
    content = json.loads(data["content"])
    assert content["app"] == "todowka"
    assert content["version"] == "1.0"
    assert "data" in content
    assert content["data"]["tasks"] == []
    assert content["data"]["areas"] == []


@pytest.mark.asyncio
async def test_export_with_tasks(client, auth_user):
    await client.post(
        "/api/tasks",
        json={"title": "Task 1"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    await client.post(
        "/api/tasks",
        json={"title": "Task 2", "gtd_status": "next"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )

    response = await client.get(
        "/api/export-import/export",
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 200
    content = json.loads(response.json()["content"])
    assert len(content["data"]["tasks"]) == 2
    titles = [t["title"] for t in content["data"]["tasks"]]
    assert "Task 1" in titles
    assert "Task 2" in titles


@pytest.mark.asyncio
async def test_export_with_related_data(client, auth_user):
    tag_resp = await client.post(
        "/api/tags",
        json={"name": "work", "color": "#FF0000"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    context_resp = await client.post(
        "/api/contexts",
        json={"name": "Office"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    context_id = context_resp.json()["id"]

    area_resp = await client.post(
        "/api/areas",
        json={"name": "Work area"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    area_id = area_resp.json()["id"]

    project_resp = await client.post(
        "/api/projects",
        json={"name": "Project X", "area_id": area_id},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    project_id = project_resp.json()["id"]

    await client.post(
        "/api/tasks",
        json={
            "title": "Tagged task",
            "tag_ids": [tag_id],
            "context_id": context_id,
            "area_id": area_id,
            "project_id": project_id,
        },
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )

    response = await client.get(
        "/api/export-import/export",
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    content = json.loads(response.json()["content"])
    assert len(content["data"]["tags"]) == 1
    assert content["data"]["tags"][0]["name"] == "work"
    assert len(content["data"]["contexts"]) == 1
    assert len(content["data"]["areas"]) == 1
    assert len(content["data"]["projects"]) == 1
    assert len(content["data"]["tasks"]) == 1
    assert tag_id in content["data"]["tasks"][0]["tag_ids"]
    assert len(content["data"]["task_tags"]) == 1


@pytest.mark.asyncio
async def test_import_creates_new_data(client, auth_user):
    import_data = {
        "version": "1.0",
        "app": "todowka",
        "exported_at": "2026-04-29T12:00:00Z",
        "data": {
            "areas": [],
            "contexts": [],
            "tags": [{"id": "tag-1", "name": "imported", "color": "#00FF00", "created_at": "2026-04-29T12:00:00Z", "updated_at": "2026-04-29T12:00:00Z"}],
            "verb_templates": [],
            "projects": [],
            "tasks": [{"id": "task-1", "title": "Imported task", "description": None, "is_completed": False, "completed_at": None, "gtd_status": "inbox", "context_id": None, "area_id": None, "project_id": None, "position": 0, "due_date": None, "notes": None, "recurrence_type": None, "recurrence_config": None, "recurrence_end_date": None, "reminder_time": None, "reminder_offsets": None, "reminder_fired": False, "deadline_notified": False, "trashed_at": None, "created_at": "2026-04-29T12:00:00Z", "updated_at": "2026-04-29T12:00:00Z", "tag_ids": ["tag-1"]}],
            "checklist_items": [],
            "task_recurrences": [],
            "task_tags": [{"task_id": "task-1", "tag_id": "tag-1"}],
        },
    }

    import io
    import urllib.parse

    file_content = json.dumps(import_data).encode("utf-8")
    files = {"file": ("import.json", io.BytesIO(file_content), "application/json")}
    response = await client.post(
        "/api/export-import/import",
        files=files,
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 200
    report = response.json()
    assert report["imported"]["tasks"] == 1
    assert report["imported"]["tags"] == 1
    assert report["imported"]["task_tags"] == 1
    assert report["skipped"] == 0

    task_resp = await client.get(
        f"/api/tasks/{import_data['data']['tasks'][0]['id']}",
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert task_resp.status_code == 200
    assert task_resp.json()["title"] == "Imported task"


@pytest.mark.asyncio
async def test_import_rejects_invalid_format(client, auth_user):
    import io

    file_content = b"not json"
    files = {"file": ("import.json", io.BytesIO(file_content), "application/json")}
    response = await client.post(
        "/api/export-import/import",
        files=files,
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_import_rejects_wrong_app(client, auth_user):
    import io

    data = {"version": "1.0", "app": "other", "data": {}}
    file_content = json.dumps(data).encode("utf-8")
    files = {"file": ("import.json", io.BytesIO(file_content), "application/json")}
    response = await client.post(
        "/api/export-import/import",
        files=files,
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_export_requires_auth(client):
    response = await client.get("/api/export-import/export")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_import_requires_auth(client):
    import io

    files = {"file": ("import.json", io.BytesIO(b"{}"), "application/json")}
    response = await client.post("/api/export-import/import", files=files)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_import_upsert_updates_existing(client, auth_user):
    task_resp = await client.post(
        "/api/tasks",
        json={"title": "Original"},
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    task_id = task_resp.json()["id"]

    import_data = {
        "version": "1.0",
        "app": "todowka",
        "exported_at": "2026-04-29T12:00:00Z",
        "data": {
            "areas": [],
            "contexts": [],
            "tags": [],
            "verb_templates": [],
            "projects": [],
            "tasks": [{"id": task_id, "title": "Updated via import", "description": None, "is_completed": False, "completed_at": None, "gtd_status": "inbox", "context_id": None, "area_id": None, "project_id": None, "position": 0, "due_date": None, "notes": None, "recurrence_type": None, "recurrence_config": None, "recurrence_end_date": None, "reminder_time": None, "reminder_offsets": None, "reminder_fired": False, "deadline_notified": False, "trashed_at": None, "created_at": "2026-04-29T12:00:00Z", "updated_at": "2026-04-29T12:00:00Z", "tag_ids": []}],
            "checklist_items": [],
            "task_recurrences": [],
            "task_tags": [],
        },
    }

    import io

    file_content = json.dumps(import_data).encode("utf-8")
    files = {"file": ("import.json", io.BytesIO(file_content), "application/json")}
    response = await client.post(
        "/api/export-import/import",
        files=files,
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert response.status_code == 200
    assert response.json()["imported"]["tasks"] == 1

    verify = await client.get(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {auth_user['token']}"},
    )
    assert verify.json()["title"] == "Updated via import"
```

- [ ] **Step 2: Run tests**

Run: `cd backend && pytest tests/test_export_import.py -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_export_import.py
git commit -m "test: add export/import API tests"
```

---

### Task 6: Frontend — API client for export/import

**Files:**
- Create: `frontend/src/api/exportImport.ts`

- [ ] **Step 1: Create the API client**

```typescript
import { httpClient } from './httpClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface ImportReport {
  imported: Record<string, number>
  skipped: number
  errors: string[]
}

export const exportImportApi = {
  async exportData(): Promise<void> {
    const authStore = (await import('../stores/authStore')).useAuthStore.getState()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authStore.isAuthenticated) {
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    const response = await fetch(`${API_BASE_URL}/export-import/export`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.content
    const filename = result.filename || `todowka_export_${new Date().toISOString().split('T')[0]}.json`

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  async importData(file: File): Promise<ImportReport> {
    const formData = new FormData()
    formData.append('file', file)

    const authStore = (await import('../stores/authStore')).useAuthStore.getState()
    const headers: Record<string, string> = {}
    if (authStore.isAuthenticated) {
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    const response = await fetch(`${API_BASE_URL}/export-import/import`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      let message = response.statusText
      try {
        const errorData = await response.json()
        message = errorData.detail || message
      } catch {}
      throw new Error(message)
    }

    return response.json()
  },
}
```

- [ ] **Step 2: Run lint and typecheck**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors for exportImport.ts

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/exportImport.ts
git commit -m "feat: add frontend export/import API client"
```

---

### Task 7: Frontend — i18n keys

**Files:**
- Modify: `frontend/src/i18n/locales/ru/settings.json`
- Modify: `frontend/src/i18n/locales/en/settings.json`

- [ ] **Step 1: Add Russian keys**

Add these keys to the end of `ru/settings.json` (before the closing `}`):

```json
  "exportData": "Экспорт данных",
  "importData": "Импорт данных",
  "exportDescription": "Скачать все ваши данные в JSON файл",
  "importDescription": "Загрузить данные из JSON файла. Существующие записи будут обновлены, новые — добавлены.",
  "exporting": "Экспорт...",
  "importing": "Импорт...",
  "exportSuccess": "Данные успешно экспортированы",
  "importSuccess": "Импортировано: задач — {{tasks}}, проектов — {{projects}}",
  "importError": "Ошибка при импорте данных",
  "confirmImport": "Импортировать данные? Существующие записи будут обновлены."
```

- [ ] **Step 2: Add English keys**

Add these keys to the end of `en/settings.json` (before the closing `}`):

```json
  "exportData": "Export data",
  "importData": "Import data",
  "exportDescription": "Download all your data as a JSON file",
  "importDescription": "Upload data from a JSON file. Existing records will be updated, new ones will be added.",
  "exporting": "Exporting...",
  "importing": "Importing...",
  "exportSuccess": "Data exported successfully",
  "importSuccess": "Imported: tasks — {{tasks}}, projects — {{projects}}",
  "importError": "Failed to import data",
  "confirmImport": "Import data? Existing records will be updated."
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/locales/ru/settings.json frontend/src/i18n/locales/en/settings.json
git commit -m "feat: add export/import i18n keys"
```

---

### Task 8: Frontend — Settings UI for export/import

**Files:**
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Add import for exportImport API and useRef**

At the top of `Settings.tsx`, add the import:

```typescript
import { useRef } from 'react'
import { exportImportApi } from '../api/exportImport'
import { performInitialSync } from '../db/syncEngine'
```

- [ ] **Step 2: Add export/import state and handlers in SettingsContent**

Inside the `SettingsContent` function, after the existing state declarations (around line 73), add:

```typescript
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
```

And add the handlers after `handleDefaultSectionChange` (around line 127):

```typescript
  const handleExport = async () => {
    setExportLoading(true)
    try {
      await exportImportApi.exportData()
      addToast({ title: t('exportSuccess'), body: '', type: 'success' })
    } catch {
      addToast({ title: t('importError'), body: '', type: 'error' })
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async (file: File) => {
    if (!confirm(t('confirmImport'))) return
    setImportLoading(true)
    try {
      const report = await exportImportApi.importData(file)
      addToast({
        title: t('importSuccess', {
          tasks: report.imported.tasks || 0,
          projects: report.imported.projects || 0,
        }),
        body: '',
        type: 'success',
      })
      if (user?.id) {
        await performInitialSync(user.id)
      }
    } catch {
      addToast({ title: t('importError'), body: '', type: 'error' })
    } finally {
      setImportLoading(false)
    }
  }
```

- [ ] **Step 3: Add export/import UI in the Data Management section**

In the existing "Data Management" card (around line 491), add after the reset UI button div (after line 509, before the closing `</div>` of the space-y-4 div):

```tsx
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('exportDescription')}
                </p>
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                >
                  {exportLoading ? t('exporting') : t('exportData')}
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('importDescription')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                >
                  {importLoading ? t('importing') : t('importData')}
                </button>
              </div>
```

- [ ] **Step 4: Run lint and typecheck**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Run: `cd frontend && npm run lint 2>&1 | tail -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/Settings.tsx
git commit -m "feat: add export/import buttons to Settings page"
```

---

### Task 9: Update docs/features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add export/import feature documentation**

Add a new entry in the appropriate category in `docs/features.md`:

```markdown
### Экспорт и импорт данных
- Экспорт всех данных пользователя в JSON формат (задачи, проекты, области, контексты, теги, шаблоны глаголов, чеклисты, повторения)
- Импорт данных из JSON файла с поддержкой upsert (обновление существующих, создание новых)
- Валидация формата файла (версия, приложение, структура)
- Кнопки экспорта/импорта в настройках (секция «Управление данными»)
- Поддержкаru/en локализации для UI экспорта/импорта
- API эндпоинты: GET /api/export-import/export, POST /api/export-import/import
```

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: add export/import feature to features.md"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run backend lint and tests**

Run: `cd backend && ruff check . && pytest tests/test_export_import.py -v`
Expected: All pass

- [ ] **Step 2: Run frontend lint and typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: No errors
