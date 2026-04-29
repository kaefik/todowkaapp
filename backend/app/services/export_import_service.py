import uuid as uuid_mod
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

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


def _dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _serialize_area(a: Area) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "description": a.description,
        "color": a.color,
        "sort_order": a.sort_order,
        "created_at": _dt(a.created_at),
        "updated_at": _dt(a.updated_at),
    }


def _serialize_context(c: Context) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "color": c.color,
        "icon": c.icon,
        "created_at": _dt(c.created_at),
        "updated_at": _dt(c.updated_at),
    }


def _serialize_tag(t: Tag) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "color": t.color,
        "created_at": _dt(t.created_at),
        "updated_at": _dt(t.updated_at),
    }


def _serialize_verb_template(v: VerbTemplate) -> dict:
    return {
        "id": v.id,
        "text": v.text,
        "icon": v.icon,
        "position": v.position,
        "created_at": _dt(v.created_at),
        "updated_at": _dt(v.updated_at),
    }


def _serialize_project(p: Project) -> dict:
    return {
        "id": p.id,
        "area_id": p.area_id,
        "name": p.name,
        "description": p.description,
        "color": p.color,
        "is_active": p.is_active,
        "sort_order": p.sort_order,
        "created_at": _dt(p.created_at),
        "updated_at": _dt(p.updated_at),
    }


def _serialize_task(t: Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "is_completed": t.is_completed,
        "completed_at": _dt(t.completed_at),
        "gtd_status": t.gtd_status,
        "context_id": t.context_id,
        "area_id": t.area_id,
        "project_id": t.project_id,
        "position": t.position,
        "due_date": _dt(t.due_date),
        "notes": t.notes,
        "recurrence_type": t.recurrence_type,
        "recurrence_config": t.recurrence_config,
        "recurrence_end_date": _dt(t.recurrence_end_date),
        "reminder_time": t.reminder_time.isoformat() if t.reminder_time else None,
        "reminder_offsets": t.reminder_offsets,
        "reminder_fired": t.reminder_fired,
        "deadline_notified": t.deadline_notified,
        "trashed_at": _dt(t.trashed_at),
        "created_at": _dt(t.created_at),
        "updated_at": _dt(t.updated_at),
        "tag_ids": [tag.id for tag in t.tags],
    }


def _serialize_checklist_item(c: ChecklistItem) -> dict:
    return {
        "id": c.id,
        "task_id": c.task_id,
        "title": c.title,
        "is_completed": c.is_completed,
        "position": c.position,
        "completed_at": _dt(c.completed_at),
        "created_at": _dt(c.created_at),
        "updated_at": _dt(c.updated_at),
    }


def _serialize_task_recurrence(r: TaskRecurrence) -> dict:
    return {
        "id": r.id,
        "task_id": r.task_id,
        "generated_task_id": r.generated_task_id,
        "due_date_of_generated_task": _dt(r.due_date_of_generated_task),
        "generated_at": _dt(r.generated_at),
        "status": r.status,
    }


class ExportImportService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def export_data(self, user_id: UUID) -> dict:
        uid = str(user_id)

        areas_result = await self.db.execute(
            select(Area).where(Area.user_id == uid)
        )
        areas = list(areas_result.scalars().all())

        contexts_result = await self.db.execute(
            select(Context).where(Context.user_id == uid)
        )
        contexts = list(contexts_result.scalars().all())

        tags_result = await self.db.execute(
            select(Tag).where(Tag.user_id == uid)
        )
        tags = list(tags_result.scalars().all())

        verb_templates_result = await self.db.execute(
            select(VerbTemplate).where(VerbTemplate.user_id == uid)
        )
        verb_templates = list(verb_templates_result.scalars().all())

        projects_result = await self.db.execute(
            select(Project).where(Project.user_id == uid)
        )
        projects = list(projects_result.scalars().all())

        tasks_result = await self.db.execute(
            select(Task).where(Task.user_id == uid)
        )
        tasks = list(tasks_result.scalars().all())

        task_ids = [t.id for t in tasks]

        if task_ids:
            checklist_result = await self.db.execute(
                select(ChecklistItem).where(ChecklistItem.task_id.in_(task_ids))
            )
            checklist_items = list(checklist_result.scalars().all())

            recurrences_result = await self.db.execute(
                select(TaskRecurrence).where(TaskRecurrence.task_id.in_(task_ids))
            )
            task_recurrences = list(recurrences_result.scalars().all())
        else:
            checklist_items = []
            task_recurrences = []

        task_tags = []
        for t in tasks:
            for tag in t.tags:
                task_tags.append({"task_id": t.id, "tag_id": tag.id})

        return {
            "version": "1.0",
            "app": "todowka",
            "exported_at": datetime.now(UTC).isoformat(),
            "data": {
                "areas": [_serialize_area(a) for a in areas],
                "contexts": [_serialize_context(c) for c in contexts],
                "tags": [_serialize_tag(t) for t in tags],
                "verb_templates": [_serialize_verb_template(v) for v in verb_templates],
                "projects": [_serialize_project(p) for p in projects],
                "tasks": [_serialize_task(t) for t in tasks],
                "checklist_items": [_serialize_checklist_item(c) for c in checklist_items],
                "task_recurrences": [_serialize_task_recurrence(r) for r in task_recurrences],
                "task_tags": task_tags,
            },
        }

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if value is None:
            return None
        return datetime.fromisoformat(value)

    @staticmethod
    def _parse_time(value: str | None):
        if value is None:
            return None
        from datetime import time as time_type
        parts = value.split(":")
        return time_type(
            int(parts[0]),
            int(parts[1]),
            int(parts[2].split(".")[0]) if len(parts) > 2 else 0,
        )

    @staticmethod
    def _set_datetime_fields(
        obj, item: dict, fields: list[str]
    ) -> None:
        for field in fields:
            val = item.get(field)
            setattr(obj, field, ExportImportService._parse_datetime(val))

    def _resolve_id(self, raw_id: str | None, id_map: dict[str, str]) -> str | None:
        if raw_id is None:
            return None
        return id_map.get(raw_id, raw_id)

    def _new_id(self, raw_id: str, id_map: dict[str, str]) -> str:
        new = str(uuid_mod.uuid4())
        id_map[raw_id] = new
        return new

    async def _import_simple_entities(
        self,
        user_id: str,
        items: list[dict],
        model_class: type,
        fields: list[str],
        imported: dict,
        key: str,
        errors: list[str],
        id_map: dict[str, str],
    ) -> set[str]:
        ids: set[str] = set()
        count = 0
        for item in items:
            entity_id = item.get("id")
            if not entity_id:
                continue
            existing = await self.db.get(model_class, entity_id)
            if existing is not None and existing.user_id != user_id:
                new_id = self._new_id(entity_id, id_map)
                kwargs: dict = {"id": new_id, "user_id": user_id}
                for field in fields:
                    if field in item:
                        kwargs[field] = item[field]
                obj = model_class(**kwargs)
                self._set_datetime_fields(obj, item, ["created_at", "updated_at"])
                self.db.add(obj)
                ids.add(new_id)
            elif existing is not None:
                for field in fields:
                    if field in item:
                        setattr(existing, field, item[field])
                self._set_datetime_fields(existing, item, ["created_at", "updated_at"])
                ids.add(entity_id)
            else:
                kwargs = {"id": entity_id, "user_id": user_id}
                for field in fields:
                    if field in item:
                        kwargs[field] = item[field]
                obj = model_class(**kwargs)
                self._set_datetime_fields(obj, item, ["created_at", "updated_at"])
                self.db.add(obj)
                ids.add(entity_id)
            count += 1
        imported[key] = count
        return ids

    async def import_data(self, user_id: UUID, import_data: dict) -> dict:
        uid = str(user_id)
        data = import_data.get("data", import_data)
        imported: dict[str, int] = {}
        errors: list[str] = []
        skipped = 0
        id_map: dict[str, str] = {}

        area_ids = await self._import_simple_entities(
            uid, data.get("areas", []), Area,
            ["name", "description", "color", "sort_order"],
            imported, "areas", errors, id_map,
        )
        await self.db.flush()

        context_ids = await self._import_simple_entities(
            uid, data.get("contexts", []), Context,
            ["name", "color", "icon"],
            imported, "contexts", errors, id_map,
        )
        await self.db.flush()

        tag_ids = await self._import_simple_entities(
            uid, data.get("tags", []), Tag,
            ["name", "color"],
            imported, "tags", errors, id_map,
        )
        await self.db.flush()

        await self._import_simple_entities(
            uid, data.get("verb_templates", []), VerbTemplate,
            ["text", "icon", "position"],
            imported, "verb_templates", errors, id_map,
        )
        await self.db.flush()

        project_count = 0
        imported_project_ids: set[str] = set()
        for item in data.get("projects", []):
            entity_id = item.get("id")
            if not entity_id:
                continue
            raw_area_id = item.get("area_id")
            area_id = self._resolve_id(raw_area_id, id_map)
            if raw_area_id and area_id not in area_ids:
                area_id = None
            existing = await self.db.get(Project, entity_id)
            if existing is not None and existing.user_id != uid:
                new_id = self._new_id(entity_id, id_map)
                obj = Project(
                    id=new_id, user_id=uid,
                    area_id=area_id,
                    name=item.get("name", ""),
                    description=item.get("description"),
                    color=item.get("color"),
                    is_active=item.get("is_active", True),
                    sort_order=item.get("sort_order", 0),
                )
                self._set_datetime_fields(obj, item, ["created_at", "updated_at"])
                self.db.add(obj)
                imported_project_ids.add(new_id)
            elif existing is not None:
                for field in ["name", "description", "color", "is_active", "sort_order"]:
                    if field in item:
                        setattr(existing, field, item[field])
                existing.area_id = area_id
                self._set_datetime_fields(existing, item, ["created_at", "updated_at"])
                imported_project_ids.add(entity_id)
            else:
                obj = Project(
                    id=entity_id, user_id=uid,
                    area_id=area_id,
                    name=item.get("name", ""),
                    description=item.get("description"),
                    color=item.get("color"),
                    is_active=item.get("is_active", True),
                    sort_order=item.get("sort_order", 0),
                )
                self._set_datetime_fields(obj, item, ["created_at", "updated_at"])
                self.db.add(obj)
                imported_project_ids.add(entity_id)
            project_count += 1
        imported["projects"] = project_count
        await self.db.flush()

        task_count = 0
        imported_task_ids: set[str] = set()
        task_fields = [
            "title", "description", "is_completed", "gtd_status",
            "position", "notes", "recurrence_type", "recurrence_config",
            "reminder_offsets", "reminder_fired", "deadline_notified",
        ]
        for item in data.get("tasks", []):
            entity_id = item.get("id")
            if not entity_id:
                continue
            raw_ctx = item.get("context_id")
            raw_area = item.get("area_id")
            raw_proj = item.get("project_id")
            context_id = self._resolve_id(raw_ctx, id_map)
            area_id = self._resolve_id(raw_area, id_map)
            project_id = self._resolve_id(raw_proj, id_map)
            if raw_ctx and context_id not in context_ids:
                context_id = None
            if raw_area and area_id not in area_ids:
                area_id = None
            if raw_proj and project_id not in imported_project_ids:
                project_id = None
            existing = await self.db.get(Task, entity_id)
            if existing is not None and existing.user_id != uid:
                new_id = self._new_id(entity_id, id_map)
                obj = Task(
                    id=new_id, user_id=uid,
                    title=item.get("title", ""),
                    context_id=context_id,
                    area_id=area_id,
                    project_id=project_id,
                )
                for field in task_fields:
                    if field in item:
                        setattr(obj, field, item[field])
                self._set_datetime_fields(obj, item, [
                    "completed_at", "due_date", "recurrence_end_date",
                    "trashed_at", "created_at", "updated_at",
                ])
                if item.get("reminder_time") is not None:
                    obj.reminder_time = self._parse_time(item["reminder_time"])
                self.db.add(obj)
                imported_task_ids.add(new_id)
            elif existing is not None:
                for field in task_fields:
                    if field in item:
                        setattr(existing, field, item[field])
                existing.context_id = context_id
                existing.area_id = area_id
                existing.project_id = project_id
                self._set_datetime_fields(existing, item, [
                    "completed_at", "due_date", "recurrence_end_date",
                    "trashed_at", "created_at", "updated_at",
                ])
                if "reminder_time" in item and item["reminder_time"] is not None:
                    existing.reminder_time = self._parse_time(item["reminder_time"])
                elif "reminder_time" in item:
                    existing.reminder_time = None
                imported_task_ids.add(entity_id)
            else:
                obj = Task(
                    id=entity_id, user_id=uid,
                    title=item.get("title", ""),
                    context_id=context_id,
                    area_id=area_id,
                    project_id=project_id,
                )
                for field in task_fields:
                    if field in item:
                        setattr(obj, field, item[field])
                self._set_datetime_fields(obj, item, [
                    "completed_at", "due_date", "recurrence_end_date",
                    "trashed_at", "created_at", "updated_at",
                ])
                if item.get("reminder_time") is not None:
                    obj.reminder_time = self._parse_time(item["reminder_time"])
                self.db.add(obj)
                imported_task_ids.add(entity_id)
            task_count += 1
        imported["tasks"] = task_count
        await self.db.flush()

        checklist_count = 0
        for item in data.get("checklist_items", []):
            entity_id = item.get("id")
            if not entity_id:
                continue
            raw_task_id = item.get("task_id")
            task_id = self._resolve_id(raw_task_id, id_map)
            if not task_id or task_id not in imported_task_ids:
                skipped += 1
                continue
            existing = await self.db.get(ChecklistItem, entity_id)
            if existing is not None:
                mapped_task = self._resolve_id(existing.task_id, id_map)
                if mapped_task not in imported_task_ids and existing.task_id not in imported_task_ids:
                    skipped += 1
                    continue
                for field in ["title", "is_completed", "position"]:
                    if field in item:
                        setattr(existing, field, item[field])
                existing.task_id = task_id
                self._set_datetime_fields(existing, item, ["completed_at", "created_at", "updated_at"])
            else:
                obj = ChecklistItem(
                    id=entity_id, task_id=task_id,
                    title=item.get("title", ""),
                    is_completed=item.get("is_completed", False),
                    position=item.get("position", 0),
                )
                self._set_datetime_fields(obj, item, ["completed_at", "created_at", "updated_at"])
                self.db.add(obj)
            checklist_count += 1
        imported["checklist_items"] = checklist_count
        await self.db.flush()

        recurrence_count = 0
        for item in data.get("task_recurrences", []):
            entity_id = item.get("id")
            if not entity_id:
                continue
            task_id = self._resolve_id(item.get("task_id"), id_map)
            gen_task_id = self._resolve_id(item.get("generated_task_id"), id_map)
            if not task_id or task_id not in imported_task_ids:
                skipped += 1
                continue
            if not gen_task_id or gen_task_id not in imported_task_ids:
                skipped += 1
                continue
            existing = await self.db.get(TaskRecurrence, entity_id)
            if existing is not None:
                existing.task_id = task_id
                existing.generated_task_id = gen_task_id
                for field in ["status"]:
                    if field in item:
                        setattr(existing, field, item[field])
                self._set_datetime_fields(existing, item, [
                    "due_date_of_generated_task", "generated_at",
                ])
            else:
                obj = TaskRecurrence(
                    id=entity_id, task_id=task_id,
                    generated_task_id=gen_task_id,
                    status=item.get("status", "completed"),
                )
                self._set_datetime_fields(obj, item, [
                    "due_date_of_generated_task", "generated_at",
                ])
                self.db.add(obj)
            recurrence_count += 1
        imported["task_recurrences"] = recurrence_count
        await self.db.flush()

        tt_count = 0
        for item in data.get("task_tags", []):
            raw_task_id = item.get("task_id")
            raw_tag_id = item.get("tag_id")
            if not raw_task_id or not raw_tag_id:
                continue
            task_id = self._resolve_id(raw_task_id, id_map)
            tag_id = self._resolve_id(raw_tag_id, id_map)
            if task_id not in imported_task_ids or tag_id not in tag_ids:
                skipped += 1
                continue
            existing = await self.db.execute(
                select(task_tags).where(
                    task_tags.c.task_id == task_id,
                    task_tags.c.tag_id == tag_id,
                )
            )
            if existing.first() is not None:
                continue
            await self.db.execute(
                task_tags.insert().values(task_id=task_id, tag_id=tag_id)
            )
            tt_count += 1
        imported["task_tags"] = tt_count
        await self.db.flush()

        return {
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
        }
