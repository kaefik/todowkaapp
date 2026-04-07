from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/todowka.db"
    secret_key: str = "changeme-generate-random-string-64-chars"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    registration_enabled: bool = True
    invite_code: str | None = None
    allowed_origins: str = "http://localhost:5173,http://localhost:80"
    app_env: str = "development"
    log_level: str = "info"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
