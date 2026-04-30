from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.context import ContextCreate, ContextListResponse, ContextResponse, ContextUpdate
from app.services.context_service import ContextService

contexts_router = APIRouter(prefix="/contexts", tags=["contexts"])


async def _publish_context_event(user_id: str, context_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", f"context_{action}", {
        "context_id": str(context_id),
        "action": action,
    })


@contexts_router.get("", response_model=ContextListResponse)
@limiter.limit(read_limit)
async def list_contexts(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None),
    case_sensitive: bool = Query(default=False),
    whole_word: bool = Query(default=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    updated_since: str | None = Query(default=None),
) -> ContextListResponse:
    from datetime import datetime as dt

    parsed_updated_since = None
    if updated_since:
        parsed_updated_since = dt.fromisoformat(updated_since)

    service = ContextService(db)
    contexts, total = await service.get_contexts(
        user_id=current_user.id, limit=limit, offset=offset, search=search,
        case_sensitive=case_sensitive, whole_word=whole_word,
        updated_since=parsed_updated_since,
    )
    return ContextListResponse(items=contexts, total=total)


@contexts_router.post("", status_code=status.HTTP_201_CREATED, response_model=ContextResponse)
@limiter.limit(write_limit)
async def create_context(
    request: Request,
    data: ContextCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContextResponse:
    service = ContextService(db)
    context = await service.create_context(user_id=current_user.id, data=data)
    await _publish_context_event(current_user.id, context.id, "created")
    return context


@contexts_router.get("/{context_id}", response_model=ContextResponse)
@limiter.limit(read_limit)
async def get_context(
    request: Request,
    context_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContextResponse:
    service = ContextService(db)
    context = await service.get_context(user_id=current_user.id, context_id=context_id)

    if context is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context not found",
        )

    return context


@contexts_router.put("/{context_id}", response_model=ContextResponse)
@limiter.limit(write_limit)
async def update_context(
    request: Request,
    context_id: str,
    data: ContextUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContextResponse:
    service = ContextService(db)
    context = await service.update_context(user_id=current_user.id, context_id=context_id, data=data)

    if context is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context not found",
        )

    await _publish_context_event(current_user.id, context_id, "updated")
    return context


@contexts_router.delete("/{context_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_context(
    request: Request,
    context_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = ContextService(db)
    deleted = await service.delete_context(user_id=current_user.id, context_id=context_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context not found",
        )

    await _publish_context_event(current_user.id, context_id, "deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
