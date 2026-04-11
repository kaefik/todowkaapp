from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.task import (
    GtdCountsResponse,
    TaskCreate,
    TaskListResponse,
    TaskMoveRequest,
    TaskReorderRequest,
    TaskResponse,
    TaskUpdate,
)
from app.services.task_service import TaskService

tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])


@tasks_router.get("/counts", response_model=GtdCountsResponse)
async def get_gtd_counts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GtdCountsResponse:
    service = TaskService(db)
    counts = await service.get_gtd_counts(user_id=current_user.id)
    return GtdCountsResponse(**counts)


@tasks_router.get("", response_model=TaskListResponse)
async def list_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    gtd_status: str | None = Query(default=None),
    context_id: str | None = Query(default=None),
    area_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    tag_id: str | None = Query(default=None),
    is_completed: bool | None = Query(default=None),
    due_date_from: str | None = Query(default=None),
    due_date_to: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort_by: str = Query(default='created_at'),
    sort_order: str = Query(default='desc'),
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListResponse:
    from datetime import datetime as dt

    parsed_due_from = None
    parsed_due_to = None
    if due_date_from:
        parsed_due_from = dt.fromisoformat(due_date_from)
    if due_date_to:
        parsed_due_to = dt.fromisoformat(due_date_to)

    service = TaskService(db)
    tasks, total = await service.get_tasks(
        user_id=current_user.id,
        gtd_status=gtd_status,
        context_id=context_id,
        area_id=area_id,
        project_id=project_id,
        tag_id=tag_id,
        is_completed=is_completed,
        due_date_from=parsed_due_from,
        due_date_to=parsed_due_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return TaskListResponse(items=tasks, total=total)


@tasks_router.post("", status_code=status.HTTP_201_CREATED, response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.create_task(user_id=current_user.id, data=data)
    return task


@tasks_router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.get_task(user_id=current_user.id, task_id=task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


@tasks_router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.update_task(user_id=current_user.id, task_id=task_id, data=data)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


@tasks_router.patch("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    task_id: str,
    data: TaskMoveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.move_task(
        user_id=current_user.id, task_id=task_id, gtd_status=data.gtd_status
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


@tasks_router.patch("/{task_id}/reorder", response_model=TaskResponse)
async def reorder_task(
    task_id: str,
    data: TaskReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.reorder_task(
        user_id=current_user.id, task_id=task_id, position=data.position
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


@tasks_router.patch("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.toggle_task(user_id=current_user.id, task_id=task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


@tasks_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = TaskService(db)
    deleted = await service.delete_task(user_id=current_user.id, task_id=task_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
