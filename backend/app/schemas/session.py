from datetime import datetime

from pydantic import BaseModel


class SessionResponse(BaseModel):
    id: str
    browser: str | None
    os: str | None
    device_type: str | None
    ip_address: str | None
    created_at: datetime
    last_activity: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    items: list[SessionResponse]


class RevokeAllRequest(BaseModel):
    current_session_id: str
