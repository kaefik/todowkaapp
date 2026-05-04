import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer
from slowapi import Limiter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.i18n import t as i18n_t
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, DeleteAccountRequest
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.security import (
    clear_access_cookie,
    clear_refresh_cookie,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_jti,
    hash_password,
    needs_rehash,
    set_access_cookie,
    set_refresh_cookie,
    verify_password,
)
from app.services.hibp import check_password_breach
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_client_ip, enabled=settings.app_env != "test")

auth_router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@auth_router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
@limiter.limit(f"{settings.register_rate_limit}/hour")
async def register(
    request: Request,
    data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not settings.registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled",
        )

    if settings.invite_code and data.invite_code != settings.invite_code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid invite code",
        )

    result = await db.execute(select(func.count(User.id)))
    user_count = result.scalar() or 0

    if settings.max_users and user_count >= settings.max_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Maximum number of users ({settings.max_users}) reached",
        )

    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )

    is_first_user = user_count == 0

    if settings.hibp_enabled:
        breach_count = await check_password_breach(data.password)
        if breach_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This password has been found in {breach_count} data breaches. Please choose a different one.",
            )

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        is_admin=is_first_user,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@auth_router.post("/login", response_model=TokenResponse)
@limiter.limit(f"{settings.login_rate_limit}/minute")
async def login(
    request: Request,
    data: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    _unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
    )

    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if user is None:
        raise _unauthorized

    if user.locked_until and user.locked_until > datetime.now(UTC):
        raise _unauthorized

    if not verify_password(data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.login_max_failed_attempts:
            user.locked_until = datetime.now(UTC) + timedelta(
                minutes=settings.login_lockout_minutes
            )
        await db.commit()
        raise _unauthorized

    if not user.is_active:
        raise _unauthorized

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(UTC)
    await db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    set_refresh_cookie(response, refresh_token)
    set_access_cookie(response, access_token)

    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    refresh_jti = get_token_jti(refresh_token)

    session_id = None
    if refresh_jti:
        try:
            session_service = SessionService(db)
            session = await session_service.create_session(
                str(user.id), refresh_jti, user_agent, ip_address
            )
            session_id = session.id
            await db.commit()
        except Exception:
            logger.warning("Failed to create session", exc_info=True)

    return TokenResponse(user=user, session_id=session_id)


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    payload = decode_token(refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    token_jti = payload.get("jti")
    if not token_jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(RevokedToken).where(RevokedToken.token_jti == token_jti))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    if user.password_changed_at is not None:
        token_iat = payload.get("iat")
        if token_iat is not None:
            from datetime import datetime as _dt

            iat_dt = _dt.fromtimestamp(token_iat, tz=UTC)
            changed_at = user.password_changed_at
            if changed_at.tzinfo is None:
                changed_at = changed_at.replace(tzinfo=UTC)
            changed_at = changed_at.replace(microsecond=0)
            if iat_dt < changed_at:
                revoked_token = RevokedToken(token_jti=token_jti)
                db.add(revoked_token)
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has been revoked",
                )

    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    set_refresh_cookie(response, new_refresh_token)
    set_access_cookie(response, access_token)

    if settings.refresh_token_rotation_enabled:
        revoked_token = RevokedToken(token_jti=token_jti)
        db.add(revoked_token)
        await db.commit()

    try:
        session_service = SessionService(db)
        if settings.refresh_token_rotation_enabled:
            new_jti = get_token_jti(new_refresh_token)
            if new_jti:
                await session_service.delete_by_jti(token_jti)
                await session_service.create_session(
                    str(user.id), new_jti, None, None
                )
                await db.commit()
        else:
            await session_service.update_activity(token_jti)
            await db.commit()
    except Exception:
        logger.warning("Failed to update session activity", exc_info=True)

    return TokenResponse(user=user)


@auth_router.post("/logout")
async def logout(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if refresh_token:
        token_jti = get_token_jti(refresh_token)
        if token_jti and settings.refresh_token_rotation_enabled:
            revoked_token = RevokedToken(token_jti=token_jti)
            db.add(revoked_token)
            await db.commit()

        if token_jti:
            try:
                session_service = SessionService(db)
                await session_service.delete_by_jti(token_jti)
                await db.commit()
            except Exception:
                pass

    clear_refresh_cookie(response)
    clear_access_cookie(response)
    return {"message": "Logged out successfully"}


@auth_router.post("/change-password")
async def change_password(
    response: Response,
    data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=i18n_t("wrongCurrentPassword"),
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=i18n_t("newPasswordSameAsCurrent"),
        )

    if settings.hibp_enabled:
        breach_count = await check_password_breach(data.new_password)
        if breach_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This password has been found in {breach_count} data breaches. Please choose a different one.",
            )

    current_user.password_hash = hash_password(data.new_password)
    current_user.password_changed_at = datetime.now(UTC)
    await db.commit()

    current_jti = get_token_jti(refresh_token) if refresh_token else None
    try:
        session_service = SessionService(db)
        await session_service.revoke_all_sessions(str(current_user.id), current_jti or "")
        await db.commit()
    except Exception:
        logger.warning("Failed to revoke sessions on password change", exc_info=True)

    if refresh_token:
        token_jti = get_token_jti(refresh_token)
        if token_jti:
            revoked = RevokedToken(token_jti=token_jti)
            db.add(revoked)
            await db.commit()

    new_access = create_access_token(data={"sub": str(current_user.id)})
    new_refresh = create_refresh_token(data={"sub": str(current_user.id)})

    set_access_cookie(response, new_access)
    set_refresh_cookie(response, new_refresh)

    new_jti = get_token_jti(new_refresh)
    if new_jti:
        try:
            session_service = SessionService(db)
            await session_service.create_session(
                str(current_user.id), new_jti, None, None
            )
            await db.commit()
        except Exception:
            logger.warning("Failed to create session after password change", exc_info=True)

    return {"message": i18n_t("passwordChanged")}


@auth_router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@auth_router.delete("/delete-account")
async def delete_account(
    response: Response,
    data: DeleteAccountRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=i18n_t("wrongPassword"),
        )

    if refresh_token:
        token_jti = get_token_jti(refresh_token)
        if token_jti:
            revoked = RevokedToken(token_jti=token_jti)
            db.add(revoked)

    await db.delete(current_user)
    await db.commit()

    clear_refresh_cookie(response)
    clear_access_cookie(response)

    return {"message": i18n_t("accountDeleted")}
