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

    @field_validator("invite_code", "max_users", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

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
