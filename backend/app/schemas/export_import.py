from pydantic import BaseModel


class ImportReport(BaseModel):
    imported: dict[str, int]
    skipped: int
    errors: list[str]
