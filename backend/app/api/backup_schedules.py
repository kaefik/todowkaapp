from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.backup_schedule import (
    BackupScheduleCreate,
    BackupScheduleResponse,
    BackupScheduleUpdate,
)
from app.services.backup_schedule_service import BackupScheduleService

backup_schedules_router = APIRouter(prefix="/backup-schedule", tags=["backup-schedule"])


@backup_schedules_router.get("", response_model=BackupScheduleResponse)
async def get_backup_schedule(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BackupScheduleService(db)
    schedule = await service.get_schedule(current_user.id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup schedule not found")
    return schedule


@backup_schedules_router.post("", response_model=BackupScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_backup_schedule(
    data: BackupScheduleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not current_user.telegram_bot_token or not current_user.telegram_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram bot must be connected first",
        )
    service = BackupScheduleService(db)
    existing = await service.get_schedule(current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backup schedule already exists. Use PUT to update.",
        )
    schedule = await service.create_schedule(current_user.id, data.model_dump())
    await db.commit()
    return schedule


@backup_schedules_router.put("", response_model=BackupScheduleResponse)
async def update_backup_schedule(
    data: BackupScheduleUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BackupScheduleService(db)
    schedule = await service.get_schedule(current_user.id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup schedule not found")
    update_data = data.model_dump(exclude_none=True)
    schedule = await service.update_schedule(schedule, update_data)
    await db.commit()
    return schedule


@backup_schedules_router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup_schedule(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BackupScheduleService(db)
    schedule = await service.get_schedule(current_user.id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup schedule not found")
    await service.delete_schedule(schedule)
    await db.commit()


@backup_schedules_router.post("/send-now")
async def send_backup_now(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not current_user.telegram_bot_token or not current_user.telegram_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram bot must be connected first",
        )
    service = BackupScheduleService(db)
    success = await service.send_backup_now(current_user)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send backup",
        )
    await db.commit()
    return {"status": "sent", "sent_at": datetime.now(UTC).isoformat()}
