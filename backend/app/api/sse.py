import asyncio
import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from app.dependencies import get_current_user
from app.event_bus import event_bus
from app.models.user import User
from app.rate_limit import limiter, sse_limit

logger = logging.getLogger(__name__)

sse_router = APIRouter(prefix="/sse", tags=["sse"])


@sse_router.get("/notifications")
@limiter.limit(sse_limit)
async def notification_stream(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventSourceResponse:
    user_id = str(current_user.id)

    if event_bus.get_subscriber_count(f"{user_id}:notifications") >= 3:
        raise HTTPException(status_code=429, detail="Too many SSE connections")

    async def event_generator():
        channel = f"{user_id}:notifications"
        queue = event_bus.subscribe(channel)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {"event": "notification", "data": json.dumps(event)}
                except TimeoutError:
                    yield {"event": "heartbeat", "data": ""}
        finally:
            event_bus.unsubscribe(channel, queue)
            logger.debug(f"SSE notification stream closed for user {user_id}")

    return EventSourceResponse(event_generator())


@sse_router.get("/sync")
@limiter.limit(sse_limit)
async def sync_stream(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventSourceResponse:
    user_id = str(current_user.id)

    if event_bus.get_subscriber_count(f"{user_id}:sync") >= 3:
        raise HTTPException(status_code=429, detail="Too many SSE connections")

    async def event_generator():
        channel = f"{user_id}:sync"
        queue = event_bus.subscribe(channel)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {"event": event.get("type", "task_updated"), "data": json.dumps(event.get("data", {}))}
                except TimeoutError:
                    yield {"event": "heartbeat", "data": ""}
        finally:
            event_bus.unsubscribe(channel, queue)
            logger.debug(f"SSE sync stream closed for user {user_id}")

    return EventSourceResponse(event_generator())
