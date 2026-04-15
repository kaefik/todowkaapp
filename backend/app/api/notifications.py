from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationListResponse

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notifications_router.get("", response_model=NotificationListResponse)
async def get_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = Query(default=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> NotificationListResponse:
    from app.schemas.notification import NotificationResponse

    query = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        query = query.where(Notification.is_read == False)

    unread_count_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    unread_count = unread_count_result.scalar() or 0

    total_count_result = await db.execute(
        select(func.count(Notification.id)).where(Notification.user_id == current_user.id)
    )
    total = total_count_result.scalar() or 0

    result = await db.execute(
        query
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    notifications = list(result.scalars().all())

    items = [NotificationResponse.model_validate(n) for n in notifications]
    return NotificationListResponse(items=items, total=total, unread_count=unread_count)


@notifications_router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    result = await db.execute(
        select(Notification).where(
            Notification.id == str(notification_id),
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if not notification.is_read:
        await db.execute(
            update(Notification)
            .where(Notification.id == str(notification_id))
            .values(is_read=True, read_at=datetime.now(UTC))
        )
        await db.commit()

    return {"status": "marked_as_read"}


@notifications_router.patch("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    await db.commit()

    return {"status": "all_marked_as_read"}


@notifications_router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    result = await db.execute(
        select(Notification).where(
            Notification.id == str(notification_id),
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    await db.execute(
        delete(Notification).where(Notification.id == str(notification_id))
    )
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
