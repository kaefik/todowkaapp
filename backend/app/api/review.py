from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.review import ReviewCompleteResponse, ReviewStatusResponse
from app.services.review_service import ReviewService

review_router = APIRouter(prefix="/review", tags=["review"])


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
) -> ReviewCompleteResponse:
    service = ReviewService(db)
    data = await service.complete_review(current_user.id)
    await db.commit()
    return ReviewCompleteResponse(**data)
