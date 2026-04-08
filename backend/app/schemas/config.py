from pydantic import BaseModel


class ConfigResponse(BaseModel):
    registration_enabled: bool
