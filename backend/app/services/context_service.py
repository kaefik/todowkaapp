from typing import Annotated
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.context import Context
from app.schemas.context import ContextCreate, ContextUpdate


class ContextService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_contexts(
        self, user_id: UUID, limit: int = 100, offset: int = 0
    ) -> tuple[list[Context], int]:
        count_result = await self.db.execute(
            select(func.count(Context.id)).where(Context.user_id == user_id)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Context)
            .where(Context.user_id == user_id)
            .order_by(Context.name.asc())
            .limit(limit)
            .offset(offset)
        )
        contexts = list(result.scalars().all())

        return contexts, total

    async def get_context(self, user_id: UUID, context_id: UUID) -> Context | None:
        result = await self.db.execute(
            select(Context).where(Context.id == context_id, Context.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _check_name_unique(self, user_id: UUID, name: str, exclude_id: UUID | None = None) -> None:
        query = select(func.count(Context.id)).where(
            Context.user_id == user_id, Context.name == name
        )
        if exclude_id:
            query = query.where(Context.id != exclude_id)
        result = await self.db.execute(query)
        if result.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Context with name '{name}' already exists",
            )

    async def create_context(self, user_id: UUID, data: ContextCreate) -> Context:
        await self._check_name_unique(user_id, data.name)

        context = Context(
            user_id=str(user_id),
            name=data.name,
            color=data.color,
            icon=data.icon,
        )
        self.db.add(context)
        await self.db.flush()
        await self.db.refresh(context)
        return context

    async def update_context(
        self, user_id: UUID, context_id: UUID, data: ContextUpdate
    ) -> Context | None:
        context = await self.get_context(user_id, context_id)
        if context is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if 'name' in update_data and update_data['name'] != context.name:
            await self._check_name_unique(user_id, update_data['name'], exclude_id=context_id)

        for field, value in update_data.items():
            setattr(context, field, value)

        await self.db.flush()
        await self.db.refresh(context)
        return context

    async def delete_context(self, user_id: UUID, context_id: UUID) -> bool:
        result = await self.db.execute(
            delete(Context).where(Context.id == context_id, Context.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount > 0
