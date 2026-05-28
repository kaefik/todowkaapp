
from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    language: str = "ru"
    timezone: str = "UTC"
    default_section: str = "inbox"


class TelegramLoginRequest(BaseModel):
    init_data: str = Field(max_length=4096)
    model_config = {"json_schema_extra": {"examples": [{"init_data": "query_id=xxx"}]}}


class TelegramLoginResponse(BaseModel):
    access_token: str
    user: UserResponse


class TelegramBindRequest(BaseModel):
    token: str
    model_config = {"json_schema_extra": {"examples": [{"token": "xxx"}]}}


class TelegramBindResponse(BaseModel):
    success: bool
    message: str = ""
