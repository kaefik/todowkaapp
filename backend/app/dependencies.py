import logging
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.security import decode_token

logger = logging.getLogger(__name__)
security = HTTPBearer()
_security_optional = HTTPBearer(auto_error=False)


async def _resolve_user_by_token(token: str | None, db: AsyncSession, auth_type: str = "unknown") -> User:
    logger.info(f"Auth attempt via {auth_type}")

    if token is None:
        logger.error(f"Auth failed: No token provided via {auth_type}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    logger.debug(f"Token: {token[:10]}...rest via {auth_type}")

    payload = decode_token(token)

    if payload is None:
        logger.error(f"Auth failed: Could not validate credentials via {auth_type}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    if payload.get("type") != "access":
        logger.error(f"Auth failed: Invalid token type via {auth_type}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")

    if user_id is None:
        logger.error(f"Auth failed: No subject in token via {auth_type}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        logger.error(f"Auth failed: User not found with id {user_id} via {auth_type}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        logger.error(f"Auth failed: User {user_id} is blocked via {auth_type}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is blocked",
        )

    logger.info(f"User authenticated: {user.id} via {auth_type}")
    return user


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await _resolve_user_by_token(credentials.credentials, db, auth_type="header")


async def get_current_user_from_cookie(
    access_token: Annotated[str | None, Cookie()] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_security_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> User:
    token = access_token or (credentials.credentials if credentials else None)
    auth_type = "cookie" if access_token else "header"
    return await _resolve_user_by_token(token, db, auth_type=auth_type)


async def get_current_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user
