from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskUpdate
from app.services.task_service import TaskService

tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])


@tasks_router.get("", response_model=TaskListResponse)
async def list_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListResponse:
    service = TaskService(db)
    tasks, total = await service.get_tasks(
        user_id=current_user.id, limit=limit, offset=offset
    )
    return TaskListResponse(items=tasks, total=total)


@tasks_router.post("", status_code=status.HTTP_201_CREATED, response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Received task data: {data}")
    logger.info(f"Task data dict: {data.model_dump()}")
    logger.info(f"Title type: {type(data.title)}, value: {repr(data.title)}")
    logger.info(f"Description type: {type(data.description)}, value: {repr(data.description)}")
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
