from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area
from app.models.checklist import ChecklistItem
from app.models.context import Context
from app.models.project import Project
from app.models.tag import Tag
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
