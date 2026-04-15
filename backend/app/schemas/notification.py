from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_serializer


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID | None = None
    type: str
    message: str
    is_read: bool
    created_at: datetime
    delivered_at: datetime | None = None
    read_at: datetime | None = None
    expires_at: datetime | None = None

    @field_serializer('created_at', 'delivered_at', 'read_at', 'expires_at')
    def serialize_datetime(self, dt: datetime | None, _info) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.isoformat() + 'Z'
        return dt.isoformat()

    model_config = {
        'from_attributes': True
    }


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int = 0
