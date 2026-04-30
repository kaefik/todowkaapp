from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.task import GtdStatus, Task
from app.models.user import User


class ReviewService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def get_review_status(self, user_id: UUID) -> dict:
        user_result = await self.db.execute(
            select(User).where(User.id == str(user_id))
        )
        user = user_result.scalar_one_or_none()

        inbox_count_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == str(user_id),
                Task.gtd_status == GtdStatus.INBOX.value,
            )
        )
        inbox_count = inbox_count_result.scalar() or 0

        inbox_result = await self.db.execute(
            select(Task.id, Task.title, Task.description, Task.due_date).where(
                Task.user_id == str(user_id),
                Task.gtd_status == GtdStatus.INBOX.value,
            )
        )
        inbox_tasks = [
            {
                "id": row.id,
                "title": row.title,
                "description": row.description,
                "due_date": row.due_date.isoformat() if row.due_date else None,
            }
            for row in inbox_result.all()
        ]

        projects_result = await self.db.execute(
            select(Project).where(
                Project.user_id == str(user_id),
                Project.is_active,
            )
        )
        active_projects = []
        for project in projects_result.scalars().all():
            has_next_result = await self.db.execute(
                select(func.count(Task.id)).where(
                    Task.project_id == project.id,
                    Task.gtd_status.in_([GtdStatus.ACTIVE.value, GtdStatus.NEXT.value]),
                    Task.user_id == str(user_id),
                )
            )
            has_next_action = (has_next_result.scalar() or 0) > 0
            active_projects.append(
                {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "has_next_action": has_next_action,
                }
            )

        someday_result = await self.db.execute(
            select(Task.id, Task.title, Task.description).where(
                Task.user_id == str(user_id),
                Task.gtd_status == GtdStatus.SOMEDAY.value,
            )
        )
        someday_tasks = [
            {
                "id": row.id,
                "title": row.title,
                "description": row.description,
            }
            for row in someday_result.all()
        ]

        return {
            "inbox_count": inbox_count,
            "inbox_tasks": inbox_tasks,
            "active_projects": active_projects,
            "someday_tasks": someday_tasks,
            "last_review_date": user.last_review_at.isoformat() if user and user.last_review_at else None,
            "review_count": user.review_count if user else 0,
        }

    async def complete_review(self, user_id: UUID) -> dict:
        user_result = await self.db.execute(
            select(User).where(User.id == str(user_id))
        )
        user = user_result.scalar_one_or_none()
        if user is None:
            return {"success": False, "error": "User not found"}

        now = datetime.now(UTC)
        user.last_review_at = now
        user.review_count = (user.review_count or 0) + 1
        await self.db.flush()

        return {
            "success": True,
            "review_count": user.review_count,
            "completed_at": now.isoformat(),
        }
