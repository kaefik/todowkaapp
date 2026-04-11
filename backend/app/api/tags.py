from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate, TaskTagOperation
from app.services.tag_service import TagService

tags_router = APIRouter(prefix="/tags", tags=["tags"])


@tags_router.get("", response_model=TagListResponse)
async def list_tags(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TagListResponse:
    service = TagService(db)
    tags, total = await service.get_tags(
        user_id=current_user.id, limit=limit, offset=offset
    )
    return TagListResponse(items=tags, total=total)


@tags_router.post("", status_code=status.HTTP_201_CREATED, response_model=TagResponse)
async def create_tag(
    data: TagCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TagResponse:
    service = TagService(db)
    tag = await service.create_tag(user_id=current_user.id, data=data)
    return tag


@tags_router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TagResponse:
    service = TagService(db)
    tag = await service.get_tag(user_id=current_user.id, tag_id=tag_id)

    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    return tag


@tags_router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    data: TagUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TagResponse:
    service = TagService(db)
    tag = await service.update_tag(user_id=current_user.id, tag_id=tag_id, data=data)

    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    return tag


@tags_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = TagService(db)
    deleted = await service.delete_tag(user_id=current_user.id, tag_id=tag_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@tags_router.post(
    "/tasks/{task_id}/tags",
    status_code=status.HTTP_200_OK,
    response_model=TagResponse,
)
async def add_tag_to_task(
    task_id: str,
    data: TaskTagOperation,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TagResponse:
    service = TagService(db)
    await service.add_tag_to_task(
        user_id=current_user.id, task_id=task_id, tag_id=data.tag_id
    )
    tag = await service.get_tag(user_id=current_user.id, tag_id=data.tag_id)
    return tag


@tags_router.delete(
    "/tasks/{task_id}/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_tag_from_task(
    task_id: str,
    tag_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = TagService(db)
    await service.remove_tag_from_task(
        user_id=current_user.id, task_id=task_id, tag_id=tag_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
