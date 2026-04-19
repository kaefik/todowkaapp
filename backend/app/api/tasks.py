from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.task import Task
from app.models.user import User
from app.schemas.recurrence import TaskRecurrenceListResponse
from app.schemas.task import (
    GtdCountsResponse,
    SubtaskCreate,
    TaskCreate,
    TaskListResponse,
    TaskMoveRequest,
    TaskReorderRequest,
    TaskResponse,
    TaskUpdate,
)
from app.services.recurrence_service import RecurrenceService
from app.services.reminder_service import ReminderService
from app.services.task_service import TaskService

tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])


async def _publish_task_event(user_id, task_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", "task_updated", {
        "task_id": str(task_id),
        "action": action,
    })


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
    include_subtasks: bool = Query(default=False),
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
        include_subtasks=include_subtasks,
        limit=limit,
        offset=offset,
    )
    items = []
    for t in tasks:
        subtasks_count, subtasks_completed = await service.get_subtask_counts(current_user.id, t.id)
        resp = TaskResponse.model_validate(t)
        resp.subtasks_count = subtasks_count
        resp.subtasks_completed = subtasks_completed
        items.append(resp)
    return TaskListResponse(items=items, total=total)


@tasks_router.post("", status_code=status.HTTP_201_CREATED, response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.create_task(user_id=current_user.id, data=data)
    await _publish_task_event(current_user.id, task.id, "created")
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

    subtasks_count, subtasks_completed = await service.get_subtask_counts(current_user.id, task.id)
    resp = TaskResponse.model_validate(task)
    resp.subtasks_count = subtasks_count
    resp.subtasks_completed = subtasks_completed
    return resp


@tasks_router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    try:
        task = await service.update_task(user_id=current_user.id, task_id=task_id, data=data)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid reference: related resource not found",
        ) from None

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    await _publish_task_event(current_user.id, task_id, "updated")
    return task


@tasks_router.patch("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    task_id: str,
    data: TaskMoveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    recurrence_service = RecurrenceService(db)
    reminder_service = ReminderService(db)
    service = TaskService(db, recurrence_service=recurrence_service, reminder_service=reminder_service)
    task = await service.move_task(
        user_id=current_user.id, task_id=task_id, gtd_status=data.gtd_status, user=current_user
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    await _publish_task_event(current_user.id, task_id, "moved")
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

    await _publish_task_event(current_user.id, task_id, "reordered")
    return task


@tasks_router.patch("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    recurrence_service = RecurrenceService(db)
    reminder_service = ReminderService(db)
    service = TaskService(db, recurrence_service=recurrence_service, reminder_service=reminder_service)
    task = await service.toggle_task(user_id=current_user.id, task_id=task_id, user=current_user)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    await _publish_task_event(current_user.id, task_id, "toggled")
    return task


@tasks_router.delete("/trash/clear", status_code=status.HTTP_200_OK)
async def clear_trash(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, int]:
    service = TaskService(db)
    deleted_count = await service.clear_trash(user_id=current_user.id)
    await _publish_task_event(current_user.id, "all", "trash_cleared")
    return {"deleted": deleted_count}


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

    await _publish_task_event(current_user.id, task_id, "deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@tasks_router.get("/{task_id}/subtasks", response_model=list[TaskResponse])
async def list_subtasks(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TaskResponse]:
    service = TaskService(db)
    parent = await service.get_task(user_id=current_user.id, task_id=task_id)
    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    subtasks = await service.get_subtasks(user_id=current_user.id, parent_task_id=task_id)
    return [TaskResponse.model_validate(st) for st in subtasks]


@tasks_router.post(
    "/{task_id}/subtasks", status_code=status.HTTP_201_CREATED, response_model=TaskResponse
)
async def create_subtask(
    task_id: str,
    data: SubtaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    service = TaskService(db)
    task = await service.create_subtask(
        user_id=current_user.id, parent_task_id=task_id, data=TaskCreate(title=data.title, description=data.description)
    )
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    await _publish_task_event(current_user.id, task.id, "subtask_created")
    return task


@tasks_router.get("/{task_id}/recurrences", response_model=TaskRecurrenceListResponse)
async def get_task_recurrences(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskRecurrenceListResponse:
    from app.schemas.recurrence import TaskRecurrenceResponse

    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    recurrence_service = RecurrenceService(db)
    recurrences, total = await recurrence_service.get_recurrence_history(task_id, limit=limit, offset=offset)

    items = [TaskRecurrenceResponse.model_validate(r) for r in recurrences]
    return TaskRecurrenceListResponse(items=items, total=total)


@tasks_router.post("/{task_id}/stop-recurrence", response_model=TaskResponse)
async def stop_task_recurrence(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    if not task.is_recurring:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not recurring",
        )

    await db.execute(
        update(Task)
        .where(Task.id == task_id)
        .values(
            recurrence_type=None,
            recurrence_config=None,
            recurrence_end_date=None
        )
    )
    await db.commit()
    await db.refresh(task)

    await _publish_task_event(current_user.id, task_id, "recurrence_stopped")
    return TaskResponse.model_validate(task)
