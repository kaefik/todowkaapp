from datetime import UTC, datetime

from pydantic import BaseModel, field_serializer


class BaseResponseSchema(BaseModel):
    @field_serializer("*")
    @classmethod
    def _serialize_naive_datetime(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=UTC).isoformat()
        return v
