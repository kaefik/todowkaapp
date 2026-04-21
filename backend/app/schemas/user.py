import re
import unicodedata
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


def _has_uppercase(s: str) -> bool:
    return any(c.isupper() for c in s)


def _has_special(s: str) -> bool:
    return any(unicodedata.category(c).startswith(('P', 'S')) for c in s)


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    is_active: bool
    is_admin: bool
    timezone: str | None = None
    created_at: datetime

    model_config = {
        'from_attributes': True
    }


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    timezone: str | None = Field(default=None, max_length=50)
    password: str | None = None

    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(v)
        except Exception as e:
            raise ValueError('Invalid timezone') from e
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) < 8 or len(v) > 100:
            raise ValueError('Password must be between 8 and 100 characters')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not _has_uppercase(v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not _has_special(v):
            raise ValueError('Password must contain at least one special character')
        return v


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    invite_code: str | None = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not _has_uppercase(v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not _has_special(v):
            raise ValueError('Password must contain at least one special character')
        return v


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    user: UserResponse
