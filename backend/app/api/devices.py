from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.device_token import DeviceToken
from app.models.user import User
from app.rate_limit import limiter, write_limit
from app.schemas.device import DeviceRegisterRequest, DeviceTokenResponse

devices_router = APIRouter(prefix="/devices", tags=["devices"])


@devices_router.post("/register", response_model=DeviceTokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit(write_limit)
async def register_device(
    request: Request,
    body: DeviceRegisterRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeviceTokenResponse:
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.user_id == current_user.id,
            DeviceToken.token == body.token,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.execute(
            update(DeviceToken)
            .where(DeviceToken.id == existing.id)
            .values(app_version=body.app_version, platform=body.platform)
        )
        await db.flush()
        await db.refresh(existing)
        return DeviceTokenResponse.model_validate(existing)

    device_token = DeviceToken(
        user_id=current_user.id,
        token=body.token,
        platform=body.platform,
        app_version=body.app_version,
    )
    db.add(device_token)
    await db.flush()
    await db.refresh(device_token)
    return DeviceTokenResponse.model_validate(device_token)


@devices_router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_device(
    request: Request,
    token_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.id == str(token_id),
            DeviceToken.user_id == current_user.id,
        )
    )
    device = result.scalar_one_or_none()

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device token not found",
        )

    await db.delete(device)
    await db.flush()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
