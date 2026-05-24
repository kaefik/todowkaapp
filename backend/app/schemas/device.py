from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.base import BaseResponseSchema


class DeviceRegisterRequest(BaseModel):
    token: str
    platform: str = "android"
    app_version: str | None = None


class DeviceTokenResponse(BaseResponseSchema):
    id: UUID
    user_id: UUID
    platform: str
    app_version: str | None = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }
