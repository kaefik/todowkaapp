from pydantic import BaseModel


class ConfigResponse(BaseModel):
    registration_enabled: bool
    max_users: int | None
    current_users: int
    registration_available: bool
    invite_code_required: bool
