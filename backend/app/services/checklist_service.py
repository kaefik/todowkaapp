from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checklist import ChecklistItem
from app.schemas.checklist import ChecklistItemCreate, ChecklistItemUpdate


class ChecklistService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_all_for_user(self, user_id: str) -> list[ChecklistItem]:
        from app.models.task import Task
        result = await self.db.execute(
            select(ChecklistItem)
            .join(Task, ChecklistItem.task_id == Task.id)
            .where(Task.user_id == str(user_id))
            .order_by(ChecklistItem.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_checklist(self, task_id: UUID | str) -> list[ChecklistItem]:
        result = await self.db.execute(
            select(ChecklistItem)
            .where(ChecklistItem.task_id == str(task_id))
            .order_by(ChecklistItem.position.asc(), ChecklistItem.created_at.asc())
        )
        return list(result.scalars().all())

    async def create_item(self, task_id: UUID | str, data: ChecklistItemCreate) -> ChecklistItem:
        item = ChecklistItem(
            task_id=str(task_id),
            title=data.title,
            position=data.position,
        )
        self.db.add(item)
        await self.db.flush()
        return item

    async def update_item(
        self, task_id: UUID | str, item_id: UUID, data: ChecklistItemUpdate
    ) -> ChecklistItem | None:
        result = await self.db.execute(
            select(ChecklistItem).where(
                ChecklistItem.id == str(item_id),
                ChecklistItem.task_id == str(task_id),
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if 'is_completed' in update_data:
            if update_data['is_completed']:
                item.completed_at = datetime.now(UTC)
            else:
                item.completed_at = None

        for field, value in update_data.items():
            setattr(item, field, value)

        item.updated_at = datetime.now(UTC)
        await self.db.flush()
        return item

    async def delete_item(self, task_id: UUID | str, item_id: UUID) -> bool:
        result = await self.db.execute(
            select(ChecklistItem).where(
                ChecklistItem.id == str(item_id),
                ChecklistItem.task_id == str(task_id),
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            return False
        await self.db.delete(item)
        await self.db.flush()
        return True

    async def reorder_items(self, task_id: UUID | str, item_ids: list[str]) -> bool:
        for position, item_id in enumerate(item_ids):
            result = await self.db.execute(
                select(ChecklistItem).where(
                    ChecklistItem.id == item_id,
                    ChecklistItem.task_id == str(task_id),
                )
            )
            item = result.scalar_one_or_none()
            if item:
                item.position = position
                item.updated_at = datetime.now(UTC)
        await self.db.flush()
        return True

    async def get_checklist_counts(self, task_id: UUID | str) -> tuple[int, int]:
        result = await self.db.execute(
            select(func.count(ChecklistItem.id), func.sum(func.cast(ChecklistItem.is_completed, Integer)))
            .where(ChecklistItem.task_id == str(task_id))
        )
        row = result.one()
        total = row[0] or 0
        completed = row[1] or 0
        return total, completed

    async def delete_by_task(self, task_id: UUID | str) -> int:
        from sqlalchemy import delete
        result = await self.db.execute(
            delete(ChecklistItem).where(ChecklistItem.task_id == str(task_id))
        )
        await self.db.flush()
        return result.rowcount
