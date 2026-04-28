import warnings
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/todowka.db"
    secret_key: str = "changeme-generate-random-string-64-chars"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    registration_enabled: bool = True
    invite_code: str | None = None
    max_users: int | None = None
    allowed_origins: str = "http://localhost:5173,http://localhost:80"
    app_env: str = "development"
    log_level: str = "info"
    login_rate_limit: int = 3
    register_rate_limit: int = 3
    refresh_token_rotation_enabled: bool = True
    login_max_failed_attempts: int = 5
    login_lockout_minutes: int = 15
    cookie_secure: bool = False
    bcrypt_rounds: int = 12
    hibp_enabled: bool = False

    @property
    def frontend_url(self) -> str:
        origins = [o.strip() for o in self.allowed_origins.split(",")]
        for origin in origins:
            if origin.startswith("https://"):
                return origin.rstrip("/")
        return origins[0].rstrip("/") if origins else "http://localhost:5173"

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str, info: Any) -> str:
        default_key = "changeme-generate-random-string-64-chars"
        if v == default_key:
            app_env = info.data.get("app_env", "development")
            if app_env == "production":
                raise ValueError("SECRET_KEY must be changed from default in production")
            warnings.warn(
                "SECRET_KEY is set to default value. Change it in production!",
                stacklevel=2,
            )
        return v

    @field_validator("invite_code", "max_users", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @field_validator("cookie_secure", mode="before")
    @classmethod
    def set_cookie_secure_for_production(cls, v: Any, info: Any) -> Any:
        if v is not None:
            result = v
        else:
            app_env = info.data.get("app_env", "development")
            result = app_env == "production"
        if not result and info.data.get("app_env", "development") != "development":
            warnings.warn(
                "cookie_secure is False in non-development environment. Cookies will be sent over HTTP.",
                stacklevel=2,
            )
        return result

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.database_url.startswith("sqlite+aiosqlite:///./"):
            relative_path = self.database_url.replace("sqlite+aiosqlite:///./", "")
            absolute_path = str(Path(__file__).parent.parent / relative_path)
            self.database_url = f"sqlite+aiosqlite:///{absolute_path}"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
