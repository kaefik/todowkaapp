from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.verb_template import (
    VerbTemplateCreate,
    VerbTemplateListResponse,
    VerbTemplateReorderRequest,
    VerbTemplateResponse,
    VerbTemplateUpdate,
)
from app.services.verb_template_service import VerbTemplateService

verb_templates_router = APIRouter(prefix='/verb-templates', tags=['verb-templates'])


@verb_templates_router.get('', response_model=VerbTemplateListResponse)
async def list_verb_templates(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> VerbTemplateListResponse:
    service = VerbTemplateService(db)
    items, total = await service.get_verb_templates(user_id=current_user.id, limit=limit, offset=offset)
    return VerbTemplateListResponse(
        items=[VerbTemplateResponse.model_validate(v) for v in items],
        total=total,
    )


@verb_templates_router.post('', response_model=VerbTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_verb_template(
    data: VerbTemplateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerbTemplateResponse:
    service = VerbTemplateService(db)
    verb = await service.create_verb_template(user_id=current_user.id, data=data)
    return VerbTemplateResponse.model_validate(verb)


@verb_templates_router.put('/{verb_id}', response_model=VerbTemplateResponse)
async def update_verb_template(
    verb_id: str,
    data: VerbTemplateUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerbTemplateResponse:
    service = VerbTemplateService(db)
    verb = await service.update_verb_template(user_id=current_user.id, verb_id=verb_id, data=data)
    if not verb:
        raise HTTPException(status_code=404, detail='Verb template not found')
    return VerbTemplateResponse.model_validate(verb)


@verb_templates_router.delete('/{verb_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_verb_template(
    verb_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    service = VerbTemplateService(db)
    deleted = await service.delete_verb_template(user_id=current_user.id, verb_id=verb_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Verb template not found')


@verb_templates_router.put('/reorder', response_model=list[VerbTemplateResponse])
async def reorder_verb_templates(
    data: VerbTemplateReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VerbTemplateResponse]:
    service = VerbTemplateService(db)
    await service.reorder_verb_templates(user_id=current_user.id, ids=data.ids)
    items, _ = await service.get_verb_templates(user_id=current_user.id)
    return [VerbTemplateResponse.model_validate(v) for v in items]


@verb_templates_router.post('/reset', response_model=list[VerbTemplateResponse])
async def reset_verb_templates(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VerbTemplateResponse]:
    service = VerbTemplateService(db)
    verbs = await service.reset_verb_templates(user_id=current_user.id)
    return [VerbTemplateResponse.model_validate(v) for v in verbs]
