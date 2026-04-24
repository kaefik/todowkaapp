from typing import Annotated
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verb_template import VerbTemplate
from app.schemas.verb_template import VerbTemplateCreate, VerbTemplateUpdate

DEFAULT_VERBS = [
    {'text': 'Купить', 'icon': '🛒'},
    {'text': 'Сделать', 'icon': '🔨'},
    {'text': 'Проверить', 'icon': '✅'},
    {'text': 'Позвонить', 'icon': '📞'},
    {'text': 'Написать', 'icon': '✉️'},
    {'text': 'Найти', 'icon': '🔍'},
]


class VerbTemplateService:
    def __init__(self, db: Annotated[AsyncSession, 'db']):
        self.db = db

    async def get_verb_templates(
        self, user_id: UUID, limit: int = 100, offset: int = 0
    ) -> tuple[list[VerbTemplate], int]:
        count_q = select(func.count()).select_from(VerbTemplate).where(VerbTemplate.user_id == user_id)
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(VerbTemplate)
            .where(VerbTemplate.user_id == user_id)
            .order_by(VerbTemplate.position, VerbTemplate.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(q)
        items = list(result.scalars().all())
        return items, total

    async def create_verb_template(self, user_id: UUID, data: VerbTemplateCreate) -> VerbTemplate:
        max_pos_q = select(func.coalesce(func.max(VerbTemplate.position), -1)).where(
            VerbTemplate.user_id == user_id
        )
        max_pos = (await self.db.execute(max_pos_q)).scalar() or 0

        verb = VerbTemplate(
            user_id=str(user_id),
            text=data.text,
            icon=data.icon,
            position=max_pos + 1,
        )
        self.db.add(verb)
        await self.db.flush()
        await self.db.refresh(verb)
        return verb

    async def update_verb_template(
        self, user_id: UUID, verb_id: str, data: VerbTemplateUpdate
    ) -> VerbTemplate | None:
        q = select(VerbTemplate).where(
            VerbTemplate.id == verb_id, VerbTemplate.user_id == str(user_id)
        )
        result = await self.db.execute(q)
        verb = result.scalar_one_or_none()
        if not verb:
            return None

        if data.text is not None:
            verb.text = data.text
        if data.icon is not None:
            verb.icon = data.icon
        await self.db.flush()
        await self.db.refresh(verb)
        return verb

    async def delete_verb_template(self, user_id: UUID, verb_id: str) -> bool:
        q = select(VerbTemplate).where(
            VerbTemplate.id == verb_id, VerbTemplate.user_id == str(user_id)
        )
        result = await self.db.execute(q)
        verb = result.scalar_one_or_none()
        if not verb:
            return False
        await self.db.delete(verb)
        await self.db.flush()
        return True

    async def reorder_verb_templates(self, user_id: UUID, ids: list[str]) -> bool:
        for position, verb_id in enumerate(ids):
            q = select(VerbTemplate).where(
                VerbTemplate.id == verb_id, VerbTemplate.user_id == str(user_id)
            )
            result = await self.db.execute(q)
            verb = result.scalar_one_or_none()
            if verb:
                verb.position = position
        await self.db.flush()
        return True

    async def reset_verb_templates(self, user_id: UUID) -> list[VerbTemplate]:
        delete_q = VerbTemplate.__table__.delete().where(VerbTemplate.user_id == str(user_id))
        await self.db.execute(delete_q)
        await self.db.flush()

        verbs = []
        for i, default in enumerate(DEFAULT_VERBS):
            verb = VerbTemplate(
                user_id=str(user_id),
                text=default['text'],
                icon=default['icon'],
                position=i,
            )
            self.db.add(verb)
            verbs.append(verb)
        await self.db.flush()
        for v in verbs:
            await self.db.refresh(v)
        return verbs
