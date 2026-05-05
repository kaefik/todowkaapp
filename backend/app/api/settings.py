from datetime import datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.user import User

settings_router = APIRouter(prefix="/settings", tags=["settings"])


class SMTPConfig(BaseModel):
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None


class SMTPConfigResponse(BaseModel):
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_from: str | None = None
    smtp_configured: bool = False


async def get_smtp_config_from_db(db: AsyncSession) -> dict:
    from sqlalchemy import text
    result = await db.execute(text(
        "SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'"
    ))
    rows = result.fetchall()
    config = {
        'smtp_host': None,
        'smtp_port': 587,
        'smtp_user': None,
        'smtp_from': None,
    }
    for row in rows:
        if row[0] == 'smtp_host':
            config['smtp_host'] = row[1]
        elif row[0] == 'smtp_port' and row[1]:
            config['smtp_port'] = int(row[1])
        elif row[0] == 'smtp_user':
            config['smtp_user'] = row[1]
        elif row[0] == 'smtp_from':
            config['smtp_from'] = row[1]
    config['smtp_configured'] = bool(config['smtp_host'] and config['smtp_user'])
    return config


@settings_router.get("/smtp", response_model=SMTPConfigResponse)
async def get_smtp_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_admin_user)],
) -> SMTPConfigResponse:
    config = await get_smtp_config_from_db(db)
    return SMTPConfigResponse(**config)


@settings_router.put("/smtp", response_model=SMTPConfigResponse)
async def update_smtp_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_admin_user)],
    config: SMTPConfig,
) -> SMTPConfigResponse:
    from sqlalchemy import text

    now = datetime.now(ZoneInfo('UTC'))

    settings_to_save = [
        ('smtp_host', config.smtp_host),
        ('smtp_port', str(config.smtp_port) if config.smtp_port else '587'),
        ('smtp_user', config.smtp_user),
        ('smtp_password', config.smtp_password),
        ('smtp_from', config.smtp_from),
    ]

    for key, value in settings_to_save:
        if value is not None:
            await db.execute(text("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (:key, :value, :updated_at)
                ON CONFLICT(key) DO UPDATE SET value = :value, updated_at = :updated_at
            """), {'key': key, 'value': value, 'updated_at': now})

    await db.commit()

    result = await get_smtp_config_from_db(db)
    return SMTPConfigResponse(**result)
