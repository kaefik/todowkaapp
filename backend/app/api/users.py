from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user, get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("", response_model=list[UserResponse])
async def get_users(
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return list(users)


@users_router.patch("/{user_id}/block", response_model=UserResponse)
async def block_user(
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
async def unblock_user(
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
async def delete_user(
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
async def update_current_user(
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
async def validate_telegram_token(
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
