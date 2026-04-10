from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.context import ContextCreate, ContextListResponse, ContextResponse, ContextUpdate
from app.services.context_service import ContextService

contexts_router = APIRouter(prefix="/contexts", tags=["contexts"])


@contexts_router.get("", response_model=ContextListResponse)
async def list_contexts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContextListResponse:
    service = ContextService(db)
    contexts, total = await service.get_contexts(
        user_id=current_user.id, limit=limit, offset=offset
    )
    return ContextListResponse(items=contexts, total=total)


@contexts_router.post("", status_code=status.HTTP_201_CREATED, response_model=ContextResponse)
async def create_context(
    data: ContextCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContextResponse:
    service = ContextService(db)
    context = await service.create_context(user_id=current_user.id, data=data)
    return context


@contexts_router.get("/{context_id}", response_model=ContextResponse)
async def get_context(
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
async def update_context(
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

    return context


@contexts_router.delete("/{context_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_context(
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

    return Response(status_code=status.HTTP_204_NO_CONTENT)
