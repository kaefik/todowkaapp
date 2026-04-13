from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TaskRecurrenceResponse(BaseModel):
    id: UUID
    task_id: UUID
    generated_task_id: UUID
    due_date_of_generated_task: datetime
    generated_at: datetime
    status: str

    model_config = {
        'from_attributes': True
    }


class TaskRecurrenceListResponse(BaseModel):
    items: list[TaskRecurrenceResponse]
    total: int
