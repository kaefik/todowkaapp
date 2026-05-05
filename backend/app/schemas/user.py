import re
import unicodedata
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.base import BaseResponseSchema


def _has_uppercase(s: str) -> bool:
    return any(c.isupper() for c in s)


def _has_special(s: str) -> bool:
    return any(unicodedata.category(c).startswith(('P', 'S')) for c in s)


VALID_DEFAULT_SECTIONS = {
    'inbox', 'active', 'today', 'tomorrow', 'next', 'waiting', 'someday',
    'completed', 'trash', 'projects', 'contexts', 'areas', 'tags',
}


class UserResponse(BaseResponseSchema):
    id: UUID
    username: str
    email: EmailStr
    is_active: bool
    is_admin: bool
    timezone: str | None = None
    default_section: str = 'inbox'
    language: str | None = None
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    telegram_notifications_enabled: bool = False
    capitalize_first: bool = True
    last_review_at: datetime | None = None
    review_count: int = 0
    review_frequency_days: int = 7
    review_notifications_enabled: bool = False
    email_notifications_enabled: bool = False
    notification_email: str | None = None
    email_verified_at: datetime | None = None
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {
        'from_attributes': True
    }

    @model_validator(mode='after')
    def mask_telegram_token(self) -> 'UserResponse':
        if self.telegram_bot_token and len(self.telegram_bot_token) > 5:
            self.telegram_bot_token = '*****' + self.telegram_bot_token[-5:]
        return self


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    timezone: str | None = Field(default=None, max_length=50)
    default_section: str | None = Field(default=None, max_length=30)
    language: str | None = Field(default=None, max_length=10)
    password: str | None = None
    telegram_bot_token: str | None = None
    telegram_notifications_enabled: bool | None = None
    capitalize_first: bool | None = None
    review_frequency_days: int | None = None
    review_notifications_enabled: bool | None = None
    email_notifications_enabled: bool | None = None

    @field_validator('default_section')
    @classmethod
    def validate_default_section(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_DEFAULT_SECTIONS:
            raise ValueError(f'Invalid default section. Allowed: {", ".join(sorted(VALID_DEFAULT_SECTIONS))}')
        return v

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
