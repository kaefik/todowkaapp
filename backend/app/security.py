import logging
import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from fastapi import Response
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        logger.warning("Password verification failed", exc_info=True)
        return False


def needs_rehash(hashed_password: str) -> bool:
    match = re.match(r'\$2[aby]\$(\d+)\$', hashed_password)
    if not match:
        return True
    current_rounds = int(match.group(1))
    return current_rounds != settings.bcrypt_rounds


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    jti = str(uuid.uuid4())
    now = datetime.now(UTC)
    to_encode.update({"exp": expire, "iat": now, "type": "refresh", "jti": jti})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def clear_access_cookie(response: Response) -> None:
    response.set_cookie(
        key="access_token",
        value="",
        max_age=0,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/api/auth",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        path="/api/auth",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


def get_token_jti(token: str) -> str | None:
    payload = decode_token(token)
    if payload is None:
        return None
    return payload.get("jti")

