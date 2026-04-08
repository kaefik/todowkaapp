from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.config import ConfigResponse
from app.models.user import User

config_router = APIRouter(prefix="/config", tags=["config"])


@config_router.get("", response_model=ConfigResponse)
async def get_config(db: Annotated[AsyncSession, Depends(get_db)]) -> ConfigResponse:
    result = await db.execute(select(func.count(User.id)))
    current_users = result.scalar() or 0

    return ConfigResponse(
        registration_enabled=settings.registration_enabled,
        max_users=settings.max_users,
        current_users=current_users,
    )
