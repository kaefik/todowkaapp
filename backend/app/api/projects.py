from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.task import TaskListResponse
from app.services.project_service import ProjectService

projects_router = APIRouter(prefix="/projects", tags=["projects"])


@projects_router.get("", response_model=ProjectListResponse)
async def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ProjectListResponse:
    service = ProjectService(db)
    projects, total = await service.get_projects(
        user_id=current_user.id, limit=limit, offset=offset
    )
    items = []
    for project in projects:
        progress = await service._calc_progress(current_user.id, project.id)
        items.append(
            ProjectDetailResponse(
                id=project.id,
                user_id=project.user_id,
                area_id=project.area_id,
                name=project.name,
                description=project.description,
                color=project.color,
                is_active=project.is_active,
                created_at=project.created_at,
                updated_at=project.updated_at,
                progress=progress,
            )
        )
    return ProjectListResponse(items=items, total=total)


@projects_router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.create_project(user_id=current_user.id, data=data)
    return project


@projects_router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectDetailResponse:
    service = ProjectService(db)
    project = await service.get_project(user_id=current_user.id, project_id=project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    progress = await service._calc_progress(current_user.id, project.id)
    return ProjectDetailResponse(
        id=project.id,
        user_id=project.user_id,
        area_id=project.area_id,
        name=project.name,
        description=project.description,
        color=project.color,
        is_active=project.is_active,
        created_at=project.created_at,
        updated_at=project.updated_at,
        progress=progress,
    )


@projects_router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.update_project(user_id=current_user.id, project_id=project_id, data=data)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@projects_router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = ProjectService(db)
    deleted = await service.delete_project(user_id=current_user.id, project_id=project_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@projects_router.get("/{project_id}/tasks", response_model=TaskListResponse)
async def get_project_tasks(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListResponse:
    project_service = ProjectService(db)
    project = await project_service.get_project(user_id=current_user.id, project_id=project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    tasks, total = await project_service.get_project_tasks(
        user_id=current_user.id, project_id=project_id, limit=limit, offset=offset
    )
    return TaskListResponse(items=tasks, total=total)
