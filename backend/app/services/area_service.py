from typing import Annotated
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area
from app.schemas.area import AreaCreate, AreaUpdate
from app.services.search import search_condition


class AreaService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_areas(
        self, user_id: UUID, limit: int = 100, offset: int = 0, search: str | None = None,
        case_sensitive: bool = False, whole_word: bool = False,
    ) -> tuple[list[Area], int]:
        base_where = [Area.user_id == user_id]
        if search is not None:
            base_where.append(
                search_condition(
                    [Area.name, Area.description],
                    search,
                    case_sensitive=case_sensitive,
                    whole_word=whole_word,
                )
            )

        count_result = await self.db.execute(
            select(func.count(Area.id)).where(*base_where)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Area)
            .where(*base_where)
            .order_by(Area.sort_order.asc(), Area.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        areas = list(result.scalars().all())

        return areas, total

    async def get_area(self, user_id: UUID, area_id: UUID) -> Area | None:
        result = await self.db.execute(
            select(Area).where(Area.id == area_id, Area.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _check_name_unique(self, user_id: UUID, name: str, exclude_id: UUID | None = None) -> None:
        query = select(func.count(Area.id)).where(
            Area.user_id == user_id, Area.name == name
        )
        if exclude_id:
            query = query.where(Area.id != exclude_id)
        result = await self.db.execute(query)
        if result.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Area with name '{name}' already exists",
            )

    async def create_area(self, user_id: UUID, data: AreaCreate) -> Area:
        import uuid as uuid_mod

        await self._check_name_unique(user_id, data.name)

        area = Area(
            id=data.id if data.id else str(uuid_mod.uuid4()),
            user_id=str(user_id),
            name=data.name,
            description=data.description,
            color=data.color,
        )
        if data.sort_order is not None:
            area.sort_order = data.sort_order
        else:
            max_result = await self.db.execute(
                select(func.coalesce(func.max(Area.sort_order), -1)).where(Area.user_id == user_id)
            )
            area.sort_order = (max_result.scalar() or -1) + 1
        self.db.add(area)
        await self.db.flush()
        await self.db.refresh(area)
        return area

    async def update_area(
        self, user_id: UUID, area_id: UUID, data: AreaUpdate
    ) -> Area | None:
        area = await self.get_area(user_id, area_id)
        if area is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if 'name' in update_data and update_data['name'] != area.name:
            await self._check_name_unique(user_id, update_data['name'], exclude_id=area_id)

        for field, value in update_data.items():
            setattr(area, field, value)

        await self.db.flush()
        await self.db.refresh(area)
        return area

    async def delete_area(self, user_id: UUID, area_id: UUID) -> bool:
        result = await self.db.execute(
            delete(Area).where(Area.id == area_id, Area.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def reorder_areas(self, user_id: UUID, items: list[dict]) -> None:
        area_ids = [item['id'] for item in items]
        result = await self.db.execute(
            select(Area).where(
                Area.id.in_(area_ids),
                Area.user_id == user_id,
            )
        )
        areas = {a.id: a for a in result.scalars().all()}
        for item in items:
            area = areas.get(item['id'])
            if area:
                area.sort_order = item['sort_order']
        await self.db.flush()
