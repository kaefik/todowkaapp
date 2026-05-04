from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.verb_template import (
    VerbTemplateCreate,
    VerbTemplateListResponse,
    VerbTemplateReorderRequest,
    VerbTemplateResponse,
    VerbTemplateUpdate,
)
from app.services.verb_template_service import VerbTemplateService

verb_templates_router = APIRouter(prefix='/verb-templates', tags=['verb-templates'])


async def _publish_verb_event(user_id: str, verb_id: str, action: str):
    from app.event_bus import event_bus
    await event_bus.publish(f"{user_id}:sync", f"verb_template_{action}", {
        "verb_id": str(verb_id),
        "action": action,
    })


@verb_templates_router.get('', response_model=VerbTemplateListResponse)
@limiter.limit(read_limit)
async def list_verb_templates(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    updated_since: str | None = Query(default=None),
) -> VerbTemplateListResponse:
    from datetime import datetime as dt

    parsed_updated_since = None
    if updated_since:
        parsed_updated_since = dt.fromisoformat(updated_since)

    service = VerbTemplateService(db)
    items, total = await service.get_verb_templates(
        user_id=current_user.id, limit=limit, offset=offset,
        updated_since=parsed_updated_since,
    )
    return VerbTemplateListResponse(
        items=[VerbTemplateResponse.model_validate(v) for v in items],
        total=total,
    )


@verb_templates_router.post('', response_model=VerbTemplateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(write_limit)
async def create_verb_template(
    request: Request,
    data: VerbTemplateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerbTemplateResponse:
    service = VerbTemplateService(db)
    verb = await service.create_verb_template(user_id=current_user.id, data=data)
    await _publish_verb_event(current_user.id, verb.id, "created")
    return VerbTemplateResponse.model_validate(verb)


@verb_templates_router.put('/{verb_id}', response_model=VerbTemplateResponse)
@limiter.limit(write_limit)
async def update_verb_template(
    request: Request,
    verb_id: str,
    data: VerbTemplateUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerbTemplateResponse:
    service = VerbTemplateService(db)
    verb = await service.update_verb_template(user_id=current_user.id, verb_id=verb_id, data=data)
    if not verb:
        raise HTTPException(status_code=404, detail='Verb template not found')
    await _publish_verb_event(current_user.id, verb_id, "updated")
    return VerbTemplateResponse.model_validate(verb)


@verb_templates_router.delete('/{verb_id}', status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_verb_template(
    request: Request,
    verb_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    service = VerbTemplateService(db)
    deleted = await service.delete_verb_template(user_id=current_user.id, verb_id=verb_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Verb template not found')
    await _publish_verb_event(current_user.id, verb_id, "deleted")


@verb_templates_router.put('/reorder', response_model=list[VerbTemplateResponse])
@limiter.limit(write_limit)
async def reorder_verb_templates(
    request: Request,
    data: VerbTemplateReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VerbTemplateResponse]:
    service = VerbTemplateService(db)
    await service.reorder_verb_templates(user_id=current_user.id, ids=data.ids)
    await _publish_verb_event(current_user.id, "all", "reordered")
    items, _ = await service.get_verb_templates(user_id=current_user.id)
    return [VerbTemplateResponse.model_validate(v) for v in items]


@verb_templates_router.post('/reset', response_model=list[VerbTemplateResponse])
@limiter.limit(write_limit)
async def reset_verb_templates(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VerbTemplateResponse]:
    service = VerbTemplateService(db)
    verbs = await service.reset_verb_templates(user_id=current_user.id, lang=getattr(current_user, 'language', None) or "ru")
    return [VerbTemplateResponse.model_validate(v) for v in verbs]
