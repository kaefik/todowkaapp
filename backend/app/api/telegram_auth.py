from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.telegram_auth import (
    TelegramLoginRequest,
    TelegramLoginResponse,
    TelegramBindRequest,
    TelegramBindResponse,
)
from app.services.telegram_auth_service import TelegramAuthService

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/login", response_model=TelegramLoginResponse)
async def telegram_login(
    request: TelegramLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Аутентификация через Telegram WebApp"""
    service = TelegramAuthService(db)
    try:
        result = await service.login_via_telegram(request.init_data)
        user_model = result["user"]
        return TelegramLoginResponse(
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token"),
            user={
                "id": int(user_model.id.replace("-", "")[:8]),
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
        )


@router.post("/bind", response_model=TelegramBindResponse)
async def bind_telegram(
    request: TelegramBindRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Привязка аккаунта к Telegram"""
    service = TelegramAuthService(db)
    telegram_chat_id = str(current_user.get("id", ""))
    success = await service.bind_account(
        current_user["sub"],
        telegram_chat_id,
        request.token
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )
    return TelegramBindResponse(success=True, message="Account linked")


@router.get("/bind-link")
async def get_bind_link(
    current_user: dict = Depends(get_current_user)
):
    """Получить ссылку для привязки Telegram"""
    from app.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as session:
        service = TelegramAuthService(session)
        link = await service.generate_bind_link(current_user["sub"])
        return {"link": link}


@router.post("/logout")
async def telegram_logout():
    """Выход из Telegram"""
    return {"success": True}