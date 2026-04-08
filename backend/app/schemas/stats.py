from pydantic import BaseModel


class StatsResponse(BaseModel):
    total: int
    active: int
    completed: int
    created_week: int
    created_month: int
    completed_week: int
    completed_month: int
