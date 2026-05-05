import random
import string
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user, get_current_user
from app.models.user import User
from app.rate_limit import limiter, read_limit, write_limit
from app.schemas.user import UserResponse, UserUpdate

users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("", response_model=list[UserResponse])
@limiter.limit(read_limit)
async def get_users(
    request: Request,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return list(users)


@users_router.patch("/{user_id}/block", response_model=UserResponse)
@limiter.limit(write_limit)
async def block_user(
    request: Request,
    user_id: str,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block yourself",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block admin user",
        )

    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_active=False)
    )
    await db.commit()
    await db.refresh(user)

    return user


@users_router.patch("/{user_id}/unblock", response_model=UserResponse)
@limiter.limit(write_limit)
async def unblock_user(
    request: Request,
    user_id: str,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_active=True)
    )
    await db.commit()
    await db.refresh(user)

    return user


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(write_limit)
async def delete_user(
    request: Request,
    user_id: str,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete admin user",
        )

    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()


@users_router.patch("/me", response_model=UserResponse)
@limiter.limit(write_limit)
async def update_current_user(
    request: Request,
    data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    update_data = data.model_dump(exclude_unset=True)

    if 'telegram_bot_token' in update_data:
        new_token = update_data['telegram_bot_token']
        if new_token != (current_user.telegram_bot_token or ''):
            update_data['telegram_chat_id'] = None
            update_data['telegram_notifications_enabled'] = False

    if data.password:
        from app.security import hash_password
        update_data['password_hash'] = hash_password(data.password)
        if 'password' in update_data:
            del update_data['password']

    if update_data:
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(current_user)

    return current_user


class TelegramTokenRequest(BaseModel):
    telegram_bot_token: str


class TelegramTokenResponse(BaseModel):
    valid: bool
    bot_username: str | None = None
    bot_name: str | None = None
    error: str | None = None


@users_router.post("/telegram/validate-token", response_model=TelegramTokenResponse)
@limiter.limit(write_limit)
async def validate_telegram_token(
    request: Request,
    data: TelegramTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> TelegramTokenResponse:
    from app.services.telegram_notifier import TelegramNotifierService

    if not data.telegram_bot_token or not data.telegram_bot_token.strip():
        return TelegramTokenResponse(valid=False, error="Token is empty")

    result = await TelegramNotifierService.validate_token(data.telegram_bot_token.strip())
    if result:
        return TelegramTokenResponse(
            valid=True,
            bot_username=result["bot_username"],
            bot_name=result["bot_name"],
        )
    return TelegramTokenResponse(valid=False, error="Invalid token or Telegram API unreachable")


class VerifyEmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailResponse(BaseModel):
    message: str


class ConfirmEmailRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class ConfirmEmailResponse(BaseModel):
    message: str
    notification_email: str


@users_router.post("/verify-email", response_model=VerifyEmailResponse)
@limiter.limit(write_limit)
async def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerifyEmailResponse:
    email = data.email.lower().strip()

    result = await db.execute(
        select(User).where(User.email == email, User.id != current_user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already used by another user",
        )

    code = "".join(random.choices(string.digits, k=6))

    from app.services.email_service import get_email_service

    email_service = get_email_service()
    if not email_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not configured",
        )

    await email_service.send_verification_email(email, code)

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(email_verification_code=code, notification_email=email)
    )
    await db.commit()

    return VerifyEmailResponse(message="Код отправлен")


@users_router.post("/confirm-email", response_model=ConfirmEmailResponse)
@limiter.limit(write_limit)
async def confirm_email(
    request: Request,
    data: ConfirmEmailRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConfirmEmailResponse:
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    if not user.email_verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code requested",
        )

    if user.email_verification_code != data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(email_verification_code=None, email_verified_at=datetime.now())
    )
    await db.commit()
    await db.refresh(user)

    return ConfirmEmailResponse(
        message="Email подтверждён",
        notification_email=user.notification_email,
    )
