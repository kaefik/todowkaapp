from datetime import datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t as i18n_t
from app.models.verb_template import VerbTemplate
from app.schemas.verb_template import VerbTemplateCreate, VerbTemplateUpdate

DEFAULT_VERBS_BY_LANG = {
    'ru': [
        {'text': 'Купить', 'icon': '🛒'},
        {'text': 'Сделать', 'icon': '🔨'},
        {'text': 'Проверить', 'icon': '✅'},
        {'text': 'Позвонить', 'icon': '📞'},
        {'text': 'Написать', 'icon': '✉️'},
        {'text': 'Найти', 'icon': '🔍'},
    ],
    'en': [
        {'text': 'Buy', 'icon': '🛒'},
        {'text': 'Do', 'icon': '🔨'},
        {'text': 'Check', 'icon': '✅'},
        {'text': 'Call', 'icon': '📞'},
        {'text': 'Write', 'icon': '✉️'},
        {'text': 'Find', 'icon': '🔍'},
    ],
    'tt': [
        {'text': 'Сатып алырга', 'icon': '🛒'},
        {'text': 'Эшләргә', 'icon': '🔨'},
        {'text': 'Тикшерергә', 'icon': '✅'},
        {'text': 'Шалтыратырга', 'icon': '📞'},
        {'text': 'Язырга', 'icon': '✉️'},
        {'text': 'Таптырырга', 'icon': '🔍'},
    ],
}

DEFAULT_VERBS = DEFAULT_VERBS_BY_LANG['ru']


class VerbTemplateService:
    def __init__(self, db: Annotated[AsyncSession, 'db']):
        self.db = db

    async def get_verb_templates(
        self, user_id: UUID, limit: int = 100, offset: int = 0, updated_since: datetime | None = None,
    ) -> tuple[list[VerbTemplate], int]:
        base_where = [VerbTemplate.user_id == user_id]
        if updated_since is not None:
            base_where.append(VerbTemplate.updated_at >= updated_since)

        count_q = select(func.count()).select_from(VerbTemplate).where(*base_where)
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(VerbTemplate)
            .where(*base_where)
            .order_by(VerbTemplate.position, VerbTemplate.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(q)
        items = list(result.scalars().all())
        return items, total

    async def create_verb_template(self, user_id: UUID, data: VerbTemplateCreate) -> VerbTemplate:
        import uuid as uuid_mod

        dup_q = select(func.count()).select_from(VerbTemplate).where(
            VerbTemplate.user_id == str(user_id),
            func.lower(VerbTemplate.text) == data.text.lower(),
        )
        if (await self.db.execute(dup_q)).scalar() > 0:
            from fastapi import HTTPException
            user_lang = 'ru'
            raise HTTPException(
                status_code=409,
                detail=i18n_t('verbAlreadyExists', user_lang, text=data.text),
            )

        max_pos_q = select(func.coalesce(func.max(VerbTemplate.position), -1)).where(
            VerbTemplate.user_id == user_id
        )
        max_pos = (await self.db.execute(max_pos_q)).scalar() or 0

        verb = VerbTemplate(
            id=data.id if data.id else str(uuid_mod.uuid4()),
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

    async def reset_verb_templates(self, user_id: UUID, lang: str = "ru") -> list[VerbTemplate]:
        delete_q = VerbTemplate.__table__.delete().where(VerbTemplate.user_id == str(user_id))
        await self.db.execute(delete_q)
        await self.db.flush()

        verbs_data = DEFAULT_VERBS_BY_LANG.get(lang, DEFAULT_VERBS)
        verbs = []
        for i, default in enumerate(verbs_data):
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
