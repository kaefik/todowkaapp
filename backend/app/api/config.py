from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.config import ConfigResponse

config_router = APIRouter(prefix="/config", tags=["config"])


@config_router.get("", response_model=ConfigResponse)
async def get_config(db: Annotated[AsyncSession, Depends(get_db)]) -> ConfigResponse:
    result = await db.execute(select(func.count(User.id)))
    current_users = result.scalar() or 0

    registration_available = settings.registration_enabled
    if settings.max_users and current_users >= settings.max_users:
        registration_available = False

    return ConfigResponse(
        registration_enabled=settings.registration_enabled,
        max_users=settings.max_users,
        current_users=current_users,
        registration_available=registration_available,
    )
