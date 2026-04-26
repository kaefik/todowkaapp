import re
import unicodedata
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.data.password_blacklist import PASSWORD_BLACKLIST


def _has_uppercase(s: str) -> bool:
    return any(c.isupper() for c in s)


def _has_special(s: str) -> bool:
    return any(unicodedata.category(c).startswith(('P', 'S')) for c in s)


def _is_common_password(password: str) -> bool:
    return password.lower() in PASSWORD_BLACKLIST


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
        if _is_common_password(v):
            raise ValueError('This password is too common, please choose a different one')
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=100)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not _has_uppercase(v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not _has_special(v):
            raise ValueError('Password must contain at least one special character')
        if _is_common_password(v):
            raise ValueError('This password is too common, please choose a different one')
        return v


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
