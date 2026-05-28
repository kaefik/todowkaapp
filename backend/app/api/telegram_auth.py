from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.telegram_auth import (
    TelegramBindRequest,
    TelegramBindResponse,
    TelegramLoginRequest,
    TelegramLoginResponse,
)
from app.security import clear_access_cookie
from app.services.telegram_auth_service import TelegramAuthService

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/login", response_model=TelegramLoginResponse)
@limiter.limit("5/minute")
async def telegram_login(
    request: Request,
    data: TelegramLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Аутентификация через Telegram WebApp"""
    service = TelegramAuthService(db)
    try:
        result = await service.login_via_telegram(data.init_data)
        user_model = result["user"]
        return TelegramLoginResponse(
            access_token=result["access_token"],
            user={
                "id": str(user_model.id),
                "email": user_model.email,
                "username": user_model.username,
                "language": user_model.language or "ru",
                "timezone": user_model.timezone or "UTC",
                "default_section": user_model.default_section,
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        ) from None


@router.post("/bind", response_model=TelegramBindResponse)
@limiter.limit(write_limit)
async def bind_telegram(
    request: Request,
    data: TelegramBindRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Привязка аккаунта к Telegram"""
    service = TelegramAuthService(db)
    telegram_chat_id = str(current_user.id)
    success = await service.bind_account(
        str(current_user.id),
        telegram_chat_id,
        data.token
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )
    return TelegramBindResponse(success=True, message="Account linked")


@router.get("/bind-link")
@limiter.limit(read_limit)
async def get_bind_link(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Получить ссылку для привязки Telegram"""
    service = TelegramAuthService(db)
    link = await service.generate_bind_link(str(current_user.id))
    return {"link": link}


@router.post("/logout")
@limiter.limit(write_limit)
async def telegram_logout(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    response: Response,
):
    """Выход из Telegram"""
    clear_access_cookie(response)
    return {"success": True}
