from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectReorderRequest,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.task import TaskListResponse
from app.services.project_service import ProjectService

projects_router = APIRouter(prefix="/projects", tags=["projects"])


async def _publish_project_event(user_id: str, project_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", f"project_{action}", {
        "project_id": str(project_id),
        "action": action,
    })


@projects_router.get("", response_model=ProjectListResponse)
@limiter.limit(read_limit)
async def list_projects(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None),
    case_sensitive: bool = Query(default=False),
    whole_word: bool = Query(default=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    updated_since: str | None = Query(default=None),
) -> ProjectListResponse:
    from datetime import datetime as dt

    parsed_updated_since = None
    if updated_since:
        parsed_updated_since = dt.fromisoformat(updated_since)

    service = ProjectService(db)
    projects, total = await service.get_projects(
        user_id=current_user.id, limit=limit, offset=offset, search=search,
        case_sensitive=case_sensitive, whole_word=whole_word,
        updated_since=parsed_updated_since,
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
                sort_order=project.sort_order,
                created_at=project.created_at,
                updated_at=project.updated_at,
                progress=progress,
            )
        )
    return ProjectListResponse(items=items, total=total)


@projects_router.put("/reorder", response_model=dict)
@limiter.limit(write_limit)
async def reorder_projects(
    request: Request,
    data: ProjectReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    service = ProjectService(db)
    items = [{"id": item.id, "sort_order": item.sort_order} for item in data.items]
    await service.reorder_projects(user_id=current_user.id, items=items)
    await _publish_project_event(current_user.id, "all", "reordered")
    return {"ok": True}


@projects_router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectResponse)
@limiter.limit(write_limit)
async def create_project(
    request: Request,
    data: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.create_project(user_id=current_user.id, data=data)
    await _publish_project_event(current_user.id, project.id, "created")
    return project


@projects_router.get("/{project_id}", response_model=ProjectDetailResponse)
@limiter.limit(read_limit)
async def get_project(
    request: Request,
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
        sort_order=project.sort_order,
        created_at=project.created_at,
        updated_at=project.updated_at,
        progress=progress,
    )


@projects_router.put("/{project_id}", response_model=ProjectResponse)
@limiter.limit(write_limit)
async def update_project(
    request: Request,
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

    await _publish_project_event(current_user.id, project_id, "updated")
    return project


@projects_router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_project(
    request: Request,
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

    await _publish_project_event(current_user.id, project_id, "deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@projects_router.get("/{project_id}/tasks", response_model=TaskListResponse)
@limiter.limit(read_limit)
async def get_project_tasks(
    request: Request,
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
