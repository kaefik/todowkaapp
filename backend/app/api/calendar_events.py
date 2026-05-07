from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventListResponse,
    CalendarEventResponse,
    CalendarEventSelectItem,
    CalendarEventUpdate,
)
from app.services.calendar_event_service import CalendarEventService

calendar_events_router = APIRouter(prefix='/calendar-events', tags=['calendar-events'])


async def _publish_calendar_event(user_id: str, event_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f'{user_id}:sync', f'calendar_event_{action}', {
        'event_id': str(event_id),
        'action': action,
    })


@calendar_events_router.get('', response_model=CalendarEventListResponse)
@limiter.limit(read_limit)
async def list_events(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_from: str | None = Query(default=None),
    start_to: str | None = Query(default=None),
    updated_since: str | None = Query(default=None),
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CalendarEventListResponse:
    from datetime import datetime

    service = CalendarEventService(db)
    start_from_dt = datetime.fromisoformat(start_from) if start_from else None
    start_to_dt = datetime.fromisoformat(start_to) if start_to else None
    updated_since_dt = datetime.fromisoformat(updated_since) if updated_since else None

    events, total = await service.get_events(
        user_id=current_user.id,
        start_from=start_from_dt,
        start_to=start_to_dt,
        updated_since=updated_since_dt,
        limit=limit,
        offset=offset,
    )
    return CalendarEventListResponse(items=events, total=total)


@calendar_events_router.get('/for-select', response_model=list[CalendarEventSelectItem])
@limiter.limit(read_limit)
async def get_events_for_select(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CalendarEventSelectItem]:
    service = CalendarEventService(db)
    events = await service.get_events_for_select(user_id=current_user.id)
    return events


@calendar_events_router.post('', status_code=status.HTTP_201_CREATED, response_model=CalendarEventResponse)
@limiter.limit(write_limit)
async def create_event(
    request: Request,
    data: CalendarEventCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CalendarEventResponse:
    service = CalendarEventService(db)
    event = await service.create_event(user_id=current_user.id, data=data)
    await _publish_calendar_event(current_user.id, event.id, 'created')
    return event


@calendar_events_router.get('/{event_id}', response_model=CalendarEventResponse)
@limiter.limit(read_limit)
async def get_event(
    request: Request,
    event_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CalendarEventResponse:
    service = CalendarEventService(db)
    event = await service.get_event(user_id=current_user.id, event_id=event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Event not found')
    return event


@calendar_events_router.put('/{event_id}', response_model=CalendarEventResponse)
@limiter.limit(write_limit)
async def update_event(
    request: Request,
    event_id: str,
    data: CalendarEventUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CalendarEventResponse:
    service = CalendarEventService(db)
    event = await service.update_event(user_id=current_user.id, event_id=event_id, data=data)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Event not found')
    await _publish_calendar_event(current_user.id, event_id, 'updated')
    return event


@calendar_events_router.delete('/{event_id}', status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_event(
    request: Request,
    event_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = CalendarEventService(db)
    deleted = await service.delete_event(user_id=current_user.id, event_id=event_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Event not found')
    await _publish_calendar_event(current_user.id, event_id, 'deleted')
    return Response(status_code=status.HTTP_204_NO_CONTENT)
