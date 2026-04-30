from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.checklist import (
    ChecklistItemCreate,
    ChecklistItemListResponse,
    ChecklistItemResponse,
    ChecklistItemUpdate,
)
from app.services.checklist_service import ChecklistService
from app.services.task_service import TaskService

checklist_router = APIRouter(prefix="/tasks", tags=["checklist"])


@checklist_router.get("/checklist/all", response_model=ChecklistItemListResponse)
@limiter.limit(read_limit)
async def list_all_checklist_items(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    updated_since: str | None = Query(default=None),
) -> ChecklistItemListResponse:
    from datetime import datetime as dt

    parsed_updated_since = None
    if updated_since:
        parsed_updated_since = dt.fromisoformat(updated_since)

    service = ChecklistService(db)
    items = await service.get_all_for_user(current_user.id, updated_since=parsed_updated_since)
    return ChecklistItemListResponse(
        items=[ChecklistItemResponse.model_validate(item) for item in items],
        total=len(items),
    )


async def _publish_checklist_event(user_id, task_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", "checklist_updated", {
        "task_id": str(task_id),
        "action": action,
    })


@checklist_router.get("/{task_id}/checklist", response_model=list[ChecklistItemResponse])
@limiter.limit(read_limit)
async def list_checklist(
    request: Request,
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ChecklistItemResponse]:
    task_service = TaskService(db)
    task = await task_service.get_task(user_id=current_user.id, task_id=task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    service = ChecklistService(db)
    items = await service.get_checklist(task_id)
    return [ChecklistItemResponse.model_validate(item) for item in items]


@checklist_router.post(
    "/{task_id}/checklist",
    status_code=status.HTTP_201_CREATED,
    response_model=ChecklistItemResponse,
)
@limiter.limit(write_limit)
async def create_checklist_item(
    request: Request,
    task_id: str,
    data: ChecklistItemCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChecklistItemResponse:
    task_service = TaskService(db)
    task = await task_service.get_task(user_id=current_user.id, task_id=task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    service = ChecklistService(db)
    item = await service.create_item(task_id, data)
    await _publish_checklist_event(current_user.id, task_id, "item_created")
    return ChecklistItemResponse.model_validate(item)


@checklist_router.patch(
    "/{task_id}/checklist/{item_id}",
    response_model=ChecklistItemResponse,
)
@limiter.limit(write_limit)
async def update_checklist_item(
    request: Request,
    task_id: str,
    item_id: str,
    data: ChecklistItemUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChecklistItemResponse:
    service = ChecklistService(db)
    item = await service.update_item(task_id, item_id, data)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found",
        )
    await _publish_checklist_event(current_user.id, task_id, "item_updated")
    return ChecklistItemResponse.model_validate(item)


@checklist_router.delete(
    "/{task_id}/checklist/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@limiter.limit(write_limit)
async def delete_checklist_item(
    request: Request,
    task_id: str,
    item_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ChecklistService(db)
    deleted = await service.delete_item(task_id, item_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found",
        )
    await _publish_checklist_event(current_user.id, task_id, "item_deleted")
    from fastapi import Response
    return Response(status_code=status.HTTP_204_NO_CONTENT)
