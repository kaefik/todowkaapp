from typing import Annotated
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_tasks(
        self, user_id: UUID, limit: int = 100, offset: int = 0
    ) -> tuple[list[Task], int]:
        count_result = await self.db.execute(
            select(func.count(Task.id)).where(Task.user_id == user_id)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Task)
            .where(Task.user_id == user_id)
            .order_by(Task.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        tasks = list(result.scalars().all())

        return tasks, total

    async def get_task(self, user_id: UUID, task_id: UUID) -> Task | None:
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_task(self, user_id: UUID, data: TaskCreate) -> Task:
        task = Task(user_id=str(user_id), title=data.title, description=data.description)
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def update_task(
        self, user_id: UUID, task_id: UUID, data: TaskUpdate
    ) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def toggle_task(self, user_id: UUID, task_id: UUID) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        task.is_completed = not task.is_completed
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def delete_task(self, user_id: UUID, task_id: UUID) -> bool:
        result = await self.db.execute(
            delete(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount > 0
