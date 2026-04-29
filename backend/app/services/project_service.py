from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.task import Task
from app.schemas.project import ProjectCreate, ProjectProgress, ProjectUpdate
from app.services.search import search_condition


class ProjectService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"]):
        self.db = db

    async def _calc_progress(self, user_id: UUID, project_id: str) -> ProjectProgress:
        total_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user_id,
                Task.project_id == project_id,
            )
        )
        tasks_total = total_result.scalar() or 0

        completed_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user_id,
                Task.project_id == project_id,
                Task.is_completed,
            )
        )
        tasks_completed = completed_result.scalar() or 0

        progress_percent = (
            round((tasks_completed / tasks_total) * 100, 1)
            if tasks_total > 0
            else 0.0
        )

        return ProjectProgress(
            tasks_total=tasks_total,
            tasks_completed=tasks_completed,
            progress_percent=progress_percent,
        )

    async def get_projects(
        self, user_id: UUID, limit: int = 100, offset: int = 0, search: str | None = None,
        case_sensitive: bool = False, whole_word: bool = False, updated_since: datetime | None = None,
    ) -> tuple[list[Project], int]:
        base_where = [Project.user_id == user_id]
        if search is not None:
            base_where.append(
                search_condition(
                    [Project.name, Project.description],
                    search,
                    case_sensitive=case_sensitive,
                    whole_word=whole_word,
                )
            )
        if updated_since is not None:
            base_where.append(Project.updated_at >= updated_since)

        count_result = await self.db.execute(
            select(func.count(Project.id)).where(*base_where)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Project)
            .where(*base_where)
            .order_by(Project.sort_order.asc(), Project.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        projects = list(result.scalars().all())

        return projects, total

    async def get_project(self, user_id: UUID, project_id: UUID) -> Project | None:
        result = await self.db.execute(
            select(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _check_name_unique(self, user_id: UUID, name: str, exclude_id: UUID | None = None) -> None:
        query = select(func.count(Project.id)).where(
            Project.user_id == user_id, Project.name == name
        )
        if exclude_id:
            query = query.where(Project.id != exclude_id)
        result = await self.db.execute(query)
        if result.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Project with name '{name}' already exists",
            )

    async def create_project(self, user_id: UUID, data: ProjectCreate) -> Project:
        import uuid as uuid_mod

        await self._check_name_unique(user_id, data.name)

        project = Project(
            id=data.id if data.id else str(uuid_mod.uuid4()),
            user_id=str(user_id),
            name=data.name,
            description=data.description,
            color=data.color,
            area_id=data.area_id,
        )
        if data.sort_order is not None:
            project.sort_order = data.sort_order
        else:
            max_result = await self.db.execute(
                select(func.coalesce(func.max(Project.sort_order), -1)).where(Project.user_id == user_id)
            )
            project.sort_order = (max_result.scalar() or -1) + 1
        self.db.add(project)
        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def update_project(
        self, user_id: UUID, project_id: UUID, data: ProjectUpdate
    ) -> Project | None:
        project = await self.get_project(user_id, project_id)
        if project is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if 'name' in update_data and update_data['name'] != project.name:
            await self._check_name_unique(user_id, update_data['name'], exclude_id=project_id)

        for field, value in update_data.items():
            setattr(project, field, value)

        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def delete_project(self, user_id: UUID, project_id: UUID) -> bool:
        result = await self.db.execute(
            delete(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def get_project_tasks(
        self, user_id: UUID, project_id: str, limit: int = 100, offset: int = 0
    ) -> tuple[list[Task], int]:
        from sqlalchemy.orm import selectinload

        count_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user_id,
                Task.project_id == project_id,
            )
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.tags))
            .where(Task.user_id == user_id, Task.project_id == project_id)
            .order_by(Task.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        tasks = list(result.scalars().all())

        return tasks, total

    async def reorder_projects(self, user_id: UUID, items: list[dict]) -> None:
        project_ids = [item['id'] for item in items]
        result = await self.db.execute(
            select(Project).where(
                Project.id.in_(project_ids),
                Project.user_id == user_id,
            )
        )
        projects = {p.id: p for p in result.scalars().all()}
        for item in items:
            project = projects.get(item['id'])
            if project:
                project.sort_order = item['sort_order']
        await self.db.flush()
