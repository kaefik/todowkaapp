from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.task import Task
from app.models.user import User
from app.schemas.stats import StatsResponse

stats_router = APIRouter(prefix="/stats", tags=["stats"])


@stats_router.get("", response_model=StatsResponse)
async def get_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StatsResponse:
    user_id = current_user.id
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_result = await db.execute(
        select(func.count(Task.id)).where(Task.user_id == user_id)
    )
    total = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.is_completed
        )
    )
    completed = completed_result.scalar() or 0

    active = total - completed

    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    created_week_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.created_at >= week_ago
        )
    )
    created_week = created_week_result.scalar() or 0

    created_month_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.created_at >= month_ago
        )
    )
    created_month = created_month_result.scalar() or 0

    completed_week_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.is_completed,
            Task.completed_at >= week_ago
        )
    )
    completed_week = completed_week_result.scalar() or 0

    completed_month_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.is_completed,
            Task.completed_at >= month_ago
        )
    )
    completed_month = completed_month_result.scalar() or 0

    return StatsResponse(
        total=total,
        active=active,
        completed=completed,
        created_week=created_week,
        created_month=created_month,
        completed_week=completed_week,
        completed_month=completed_month,
    )
