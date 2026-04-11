from datetime import datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import Integer, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tag import Tag
from app.models.task import GtdStatus, Task
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_tasks(
        self,
        user_id: UUID,
        gtd_status: str | None = None,
        context_id: str | None = None,
        area_id: str | None = None,
        project_id: str | None = None,
        tag_id: str | None = None,
        is_completed: bool | None = None,
        due_date_from: datetime | None = None,
        due_date_to: datetime | None = None,
        search: str | None = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc',
        include_subtasks: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        base_where = [Task.user_id == user_id]
        if not include_subtasks:
            base_where.append(Task.parent_task_id.is_(None))

        if gtd_status is not None:
            base_where.append(Task.gtd_status == gtd_status)
        if context_id is not None:
            base_where.append(Task.context_id == context_id)
        if area_id is not None:
            base_where.append(Task.area_id == area_id)
        if project_id is not None:
            base_where.append(Task.project_id == project_id)
        if is_completed is not None:
            base_where.append(Task.is_completed == is_completed)
        if due_date_from is not None:
            base_where.append(Task.due_date >= due_date_from)
        if due_date_to is not None:
            base_where.append(Task.due_date <= due_date_to)
        if search is not None:
            base_where.append(
                (Task.title.ilike(f'%{search}%'))
                | (Task.description.ilike(f'%{search}%'))
                | (Task.notes.ilike(f'%{search}%'))
            )

        if tag_id is not None:
            from app.models.tag import task_tags

            count_stmt = (
                select(func.count(Task.id))
                .select_from(Task)
                .join(task_tags, Task.id == task_tags.c.task_id)
                .where(task_tags.c.tag_id == tag_id, *base_where)
            )
        else:
            count_stmt = select(func.count(Task.id)).where(*base_where)

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        sort_column = getattr(Task, sort_by, Task.created_at)
        order = sort_column.desc() if sort_order == 'desc' else sort_column.asc()

        if tag_id is not None:
            from app.models.tag import task_tags

            result = await self.db.execute(
                select(Task)
                .options(selectinload(Task.tags))
                .join(task_tags, Task.id == task_tags.c.task_id)
                .where(task_tags.c.tag_id == tag_id, *base_where)
                .order_by(order)
                .limit(limit)
                .offset(offset)
            )
        else:
            result = await self.db.execute(
                select(Task)
                .options(selectinload(Task.tags))
                .where(*base_where)
                .order_by(order)
                .limit(limit)
                .offset(offset)
            )
        tasks = list(result.scalars().all())

        return tasks, total

    async def get_task(self, user_id: UUID, task_id: UUID | str) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.tags))
            .where(Task.id == task_id, Task.user_id == user_id)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def _resolve_tags(self, user_id: UUID, tag_ids: list[str]) -> list[Tag]:
        result = await self.db.execute(
            select(Tag).where(
                Tag.user_id == user_id,
                Tag.id.in_(tag_ids),
            )
        )
        return list(result.scalars().all())

    async def create_task(self, user_id: UUID, data: TaskCreate) -> Task:
        task = Task(
            user_id=str(user_id),
            title=data.title,
            description=data.description,
            gtd_status=data.gtd_status.value if isinstance(data.gtd_status, GtdStatus) else data.gtd_status,
            context_id=data.context_id,
            area_id=data.area_id,
            project_id=data.project_id,
            parent_task_id=data.parent_task_id,
            due_date=data.due_date,
            notes=data.notes,
        )
        if data.tag_ids:
            tags = await self._resolve_tags(user_id, data.tag_ids)
            task.tags = tags
        self.db.add(task)
        await self.db.flush()
        return await self.get_task(user_id, task.id)

    async def update_task(
        self, user_id: UUID, task_id: UUID, data: TaskUpdate
    ) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        tag_ids = update_data.pop('tag_ids', None)
        if tag_ids is not None:
            tags = await self._resolve_tags(user_id, tag_ids)
            task.tags = tags

        if 'gtd_status' in update_data:
            val = update_data.pop('gtd_status')
            update_data['gtd_status'] = val.value if isinstance(val, GtdStatus) else val

        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.flush()
        return await self.get_task(user_id, task_id)

    async def move_task(self, user_id: UUID, task_id: UUID, gtd_status: GtdStatus) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        task.gtd_status = gtd_status.value
        if gtd_status == GtdStatus.COMPLETED:
            task.is_completed = True
            task.completed_at = datetime.now()
        elif task.gtd_status != GtdStatus.COMPLETED.value:
            task.is_completed = False
            task.completed_at = None

        await self.db.flush()
        return await self.get_task(user_id, task_id)

    async def reorder_task(self, user_id: UUID, task_id: UUID, position: int) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        task.position = position
        await self.db.flush()
        return await self.get_task(user_id, task_id)

    async def get_gtd_counts(self, user_id: UUID) -> dict[str, int]:
        result = await self.db.execute(
            select(Task.gtd_status, func.count(Task.id))
            .where(Task.user_id == user_id)
            .group_by(Task.gtd_status)
        )
        rows = result.all()
        counts = {s.value: 0 for s in GtdStatus}
        for status_val, cnt in rows:
            counts[status_val] = cnt
        return counts

    async def toggle_task(self, user_id: UUID, task_id: UUID) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        task.is_completed = not task.is_completed
        if task.is_completed:
            task.completed_at = datetime.now()
            task.gtd_status = GtdStatus.COMPLETED.value
        else:
            task.completed_at = None
            task.gtd_status = GtdStatus.INBOX.value
        await self.db.flush()
        return await self.get_task(user_id, task_id)

    async def delete_task(self, user_id: UUID, task_id: UUID) -> bool:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return False
        await self.db.execute(
            delete(Task).where(Task.parent_task_id == str(task_id))
        )
        await self.db.delete(task)
        await self.db.flush()
        return True

    async def get_subtasks(self, user_id: UUID, parent_task_id: UUID | str) -> list[Task]:
        parent = await self.get_task(user_id, parent_task_id)
        if parent is None:
            return []
        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.tags))
            .where(Task.parent_task_id == str(parent_task_id), Task.user_id == user_id)
            .order_by(Task.position.asc(), Task.created_at.asc())
        )
        return list(result.scalars().all())

    async def create_subtask(
        self, user_id: UUID, parent_task_id: UUID | str, data: TaskCreate
    ) -> Task | None:
        parent = await self.get_task(user_id, parent_task_id)
        if parent is None:
            return None
        task = Task(
            user_id=str(user_id),
            title=data.title,
            description=data.description,
            gtd_status=data.gtd_status.value if isinstance(data.gtd_status, GtdStatus) else data.gtd_status,
            context_id=data.context_id,
            area_id=data.area_id,
            project_id=data.project_id,
            parent_task_id=str(parent_task_id),
            due_date=data.due_date,
            notes=data.notes,
        )
        if data.tag_ids:
            tags = await self._resolve_tags(user_id, data.tag_ids)
            task.tags = tags
        self.db.add(task)
        await self.db.flush()
        return await self.get_task(user_id, task.id)

    async def get_subtask_counts(self, user_id: UUID, parent_task_id: UUID | str) -> tuple[int, int]:
        result = await self.db.execute(
            select(func.count(Task.id), func.sum(func.cast(Task.is_completed, Integer)))
            .where(Task.parent_task_id == str(parent_task_id), Task.user_id == user_id)
        )
        row = result.one()
        total = row[0] or 0
        completed = row[1] or 0
        return total, completed
