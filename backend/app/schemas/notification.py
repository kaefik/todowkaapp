from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID | None = None
    type: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None
    expires_at: datetime | None = None

    model_config = {
        'from_attributes': True
    }


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int = 0
