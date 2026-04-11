from typing import Annotated
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag, task_tags
from app.models.task import Task
from app.schemas.tag import TagCreate, TagUpdate


class TagService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_tags(
        self, user_id: UUID, limit: int = 100, offset: int = 0
    ) -> tuple[list[Tag], int]:
        count_result = await self.db.execute(
            select(func.count(Tag.id)).where(Tag.user_id == user_id)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Tag)
            .where(Tag.user_id == user_id)
            .order_by(Tag.name.asc())
            .limit(limit)
            .offset(offset)
        )
        tags = list(result.scalars().all())

        return tags, total

    async def get_tag(self, user_id: UUID, tag_id: UUID) -> Tag | None:
        result = await self.db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _check_name_unique(self, user_id: UUID, name: str, exclude_id: UUID | None = None) -> None:
        query = select(func.count(Tag.id)).where(
            Tag.user_id == user_id, Tag.name == name
        )
        if exclude_id:
            query = query.where(Tag.id != exclude_id)
        result = await self.db.execute(query)
        if result.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tag with name '{name}' already exists",
            )

    async def create_tag(self, user_id: UUID, data: TagCreate) -> Tag:
        await self._check_name_unique(user_id, data.name)

        tag = Tag(
            user_id=str(user_id),
            name=data.name,
            color=data.color,
        )
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def update_tag(
        self, user_id: UUID, tag_id: UUID, data: TagUpdate
    ) -> Tag | None:
        tag = await self.get_tag(user_id, tag_id)
        if tag is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if 'name' in update_data and update_data['name'] != tag.name:
            await self._check_name_unique(user_id, update_data['name'], exclude_id=tag_id)

        for field, value in update_data.items():
            setattr(tag, field, value)

        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def delete_tag(self, user_id: UUID, tag_id: UUID) -> bool:
        result = await self.db.execute(
            delete(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def add_tag_to_task(self, user_id: UUID, task_id: UUID, tag_id: UUID) -> bool:
        task_result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = task_result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )

        tag = await self.get_tag(user_id, tag_id)
        if tag is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found",
            )

        existing = await self.db.execute(
            select(func.count())
            .select_from(task_tags)
            .where(
                task_tags.c.task_id == str(task_id),
                task_tags.c.tag_id == str(tag_id),
            )
        )
        if existing.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tag is already attached to this task",
            )

        await self.db.execute(
            task_tags.insert().values(task_id=str(task_id), tag_id=str(tag_id))
        )
        await self.db.flush()
        return True

    async def remove_tag_from_task(self, user_id: UUID, task_id: UUID, tag_id: UUID) -> bool:
        task_result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        if task_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )

        tag = await self.get_tag(user_id, tag_id)
        if tag is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found",
            )

        result = await self.db.execute(
            task_tags.delete().where(
                task_tags.c.task_id == str(task_id),
                task_tags.c.tag_id == str(tag_id),
            )
        )
        await self.db.flush()
        return result.rowcount > 0
