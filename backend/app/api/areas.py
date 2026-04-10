from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.area import AreaCreate, AreaListResponse, AreaResponse, AreaUpdate
from app.services.area_service import AreaService

areas_router = APIRouter(prefix="/areas", tags=["areas"])


@areas_router.get("", response_model=AreaListResponse)
async def list_areas(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AreaListResponse:
    service = AreaService(db)
    areas, total = await service.get_areas(
        user_id=current_user.id, limit=limit, offset=offset
    )
    return AreaListResponse(items=areas, total=total)


@areas_router.post("", status_code=status.HTTP_201_CREATED, response_model=AreaResponse)
async def create_area(
    data: AreaCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AreaResponse:
    service = AreaService(db)
    area = await service.create_area(user_id=current_user.id, data=data)
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

    return Response(status_code=status.HTTP_204_NO_CONTENT)
