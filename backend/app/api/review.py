from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.review import (
    ReviewCompleteResponse,
    ReviewStatusResponse,
    ReviewSummaryResponse,
)
from app.services.review_service import ReviewService

review_router = APIRouter(prefix="/review", tags=["review"])


class ReviewCompleteRequest(BaseModel):
    inbox_processed: int = 0
    next_actions_added: int = 0
    someday_activated: int = 0


@review_router.get("/summary", response_model=ReviewSummaryResponse)
async def get_review_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReviewSummaryResponse:
    service = ReviewService(db)
    data = await service.get_summary(current_user.id)
    return ReviewSummaryResponse(**data)


@review_router.get("/status", response_model=ReviewStatusResponse)
async def get_review_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReviewStatusResponse:
    service = ReviewService(db)
    data = await service.get_review_status(current_user.id)
    return ReviewStatusResponse(**data)


@review_router.post("/complete", response_model=ReviewCompleteResponse)
async def complete_review(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ReviewCompleteRequest | None = None,
) -> ReviewCompleteResponse:
    service = ReviewService(db)
    stats = body.model_dump() if body else None
    data = await service.complete_review(current_user.id, stats)
    await db.commit()
    return ReviewCompleteResponse(**data)
