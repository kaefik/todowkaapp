from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.area import (
    AreaCreate,
    AreaListResponse,
    AreaReorderRequest,
    AreaResponse,
    AreaUpdate,
)
from app.services.area_service import AreaService

areas_router = APIRouter(prefix="/areas", tags=["areas"])


async def _publish_area_event(user_id: str, area_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", f"area_{action}", {
        "area_id": str(area_id),
        "action": action,
    })


@areas_router.get("", response_model=AreaListResponse)
async def list_areas(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None),
    case_sensitive: bool = Query(default=False),
    whole_word: bool = Query(default=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    updated_since: str | None = Query(default=None),
) -> AreaListResponse:
    from datetime import datetime as dt

    parsed_updated_since = None
    if updated_since:
        parsed_updated_since = dt.fromisoformat(updated_since)

    service = AreaService(db)
    areas, total = await service.get_areas(
        user_id=current_user.id, limit=limit, offset=offset, search=search,
        case_sensitive=case_sensitive, whole_word=whole_word,
        updated_since=parsed_updated_since,
    )
    return AreaListResponse(items=areas, total=total)


@areas_router.put("/reorder", response_model=dict)
async def reorder_areas(
    data: AreaReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    service = AreaService(db)
    items = [{"id": item.id, "sort_order": item.sort_order} for item in data.items]
    await service.reorder_areas(user_id=current_user.id, items=items)
    await _publish_area_event(current_user.id, "all", "reordered")
    return {"ok": True}


@areas_router.post("", status_code=status.HTTP_201_CREATED, response_model=AreaResponse)
async def create_area(
    data: AreaCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AreaResponse:
    service = AreaService(db)
    area = await service.create_area(user_id=current_user.id, data=data)
    await _publish_area_event(current_user.id, area.id, "created")
    return area


@areas_router.get("/{area_id}", response_model=AreaResponse)
async def get_area(
    area_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AreaResponse:
    service = AreaService(db)
    area = await service.get_area(user_id=current_user.id, area_id=area_id)

    if area is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    return area


@areas_router.put("/{area_id}", response_model=AreaResponse)
async def update_area(
    area_id: str,
    data: AreaUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AreaResponse:
    service = AreaService(db)
    area = await service.update_area(user_id=current_user.id, area_id=area_id, data=data)

    if area is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    await _publish_area_event(current_user.id, area_id, "updated")
    return area


@areas_router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(
    area_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = AreaService(db)
    deleted = await service.delete_area(user_id=current_user.id, area_id=area_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    await _publish_area_event(current_user.id, area_id, "deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
