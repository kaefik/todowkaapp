from datetime import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.deleted_entity import DeletionService
from app.models.user import User

deleted_router = APIRouter(prefix="/deleted", tags=["deleted"])


@deleted_router.get("")
async def get_deleted_entities(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    since: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
):
    service = DeletionService(db)
    parsed_since = dt.fromisoformat(since) if since else None
    items = await service.get_deleted(current_user.id, parsed_since, entity_type)
    return {"items": [
        {"entity_type": i.entity_type, "entity_id": i.entity_id, "deleted_at": i.deleted_at.isoformat()}
        for i in items
    ]}
