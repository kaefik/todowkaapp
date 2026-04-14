import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.dependencies import get_current_user_from_cookie
from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User

sse_router = APIRouter(prefix="/sse", tags=["sse"])


@sse_router.get("/notifications")
async def notification_stream(
    current_user: Annotated[User, Depends(get_current_user_from_cookie)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    from collections import defaultdict

    async def event_generator() -> AsyncIterator[dict]:
        sent_notifications = defaultdict(set)
        try:
            while True:
                result = await db.execute(
                    select(Notification)
                    .where(Notification.user_id == current_user.id)
                    .where(Notification.created_at >= datetime.now(UTC).replace(microsecond=0) - timedelta(seconds=1))
                )
                notifications = result.scalars().all()

                for notification in notifications:
                    notification_id = str(notification.id)
                    if notification_id not in sent_notifications[current_user.id]:
                        sent_notifications[current_user.id].add(notification_id)
                        yield {
                            "event": "notification",
                            "data": json.dumps({
                                "id": notification.id,
                                "user_id": notification.user_id,
                                "task_id": notification.task_id,
                                "type": notification.type,
                                "message": notification.message,
                                "is_read": notification.is_read,
                                "created_at": notification.created_at.isoformat(),
                                "read_at": notification.read_at.isoformat() if notification.read_at else None,
                                "expires_at": notification.expires_at.isoformat() if notification.expires_at else None,
                            })
                        }

                await asyncio.sleep(1)
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    return EventSourceResponse(event_generator())


@sse_router.get("/sync")
async def sync_stream(
    current_user: Annotated[User, Depends(get_current_user_from_cookie)],
    db: Annotated[AsyncSession, Depends(get_db)],
    last_sync: str | None = Query(default=None),
) -> StreamingResponse:

    async def event_generator() -> AsyncIterator[dict]:
        try:
            last_event_time = datetime.now(UTC) if not last_sync else datetime.fromisoformat(last_sync)

            while True:
                current_time = datetime.now(UTC)

                result = await db.execute(
                    select(Task)
                    .where(Task.user_id == current_user.id)
                    .where(Task.updated_at >= last_event_time)
                )
                tasks = result.scalars().all()

                for task in tasks:
                    if task.updated_at > last_event_time:
                        yield {
                            "event": "task_updated",
                            "data": json.dumps({
                                "id": task.id,
                                "user_id": task.user_id,
                                "title": task.title,
                                "is_completed": task.is_completed,
                                "gtd_status": task.gtd_status,
                                "updated_at": task.updated_at.isoformat(),
                            })
                        }

                last_event_time = current_time
                await asyncio.sleep(2)
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    return EventSourceResponse(event_generator())
