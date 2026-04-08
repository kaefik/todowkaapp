from fastapi import APIRouter

from app.config import settings

config_router = APIRouter(prefix="/config", tags=["config"])


@config_router.get("")
async def get_config():
    return {
        "registration_enabled": settings.registration_enabled,
    }
