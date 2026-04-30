from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate
from app.services.tag_service import TagService

tags_router = APIRouter(prefix="/tags", tags=["tags"])


async def _publish_tag_event(user_id: str, tag_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", f"tag_{action}", {
        "tag_id": str(tag_id),
        "action": action,
    })


@tags_router.get("", response_model=TagListResponse)
@limiter.limit(read_limit)
async def list_tags(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None),
    case_sensitive: bool = Query(default=False),
    whole_word: bool = Query(default=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    updated_since: str | None = Query(default=None),
) -> TagListResponse:
    from datetime import datetime as dt

    parsed_updated_since = None
    if updated_since:
        parsed_updated_since = dt.fromisoformat(updated_since)

    service = TagService(db)
    tags, total = await service.get_tags(
        user_id=current_user.id, limit=limit, offset=offset, search=search,
        case_sensitive=case_sensitive, whole_word=whole_word,
        updated_since=parsed_updated_since,
    )
    return TagListResponse(items=tags, total=total)


@tags_router.post("", status_code=status.HTTP_201_CREATED, response_model=TagResponse)
@limiter.limit(write_limit)
async def create_tag(
    request: Request,
    data: TagCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TagResponse:
    service = TagService(db)
    tag = await service.create_tag(user_id=current_user.id, data=data)
    await _publish_tag_event(current_user.id, tag.id, "created")
    return tag


@tags_router.get("/{tag_id}", response_model=TagResponse)
@limiter.limit(read_limit)
async def get_tag(
    request: Request,
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
@limiter.limit(write_limit)
async def update_tag(
    request: Request,
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

    await _publish_tag_event(current_user.id, tag_id, "updated")
    return tag


@tags_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_tag(
    request: Request,
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

    await _publish_tag_event(current_user.id, tag_id, "deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
