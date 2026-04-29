import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.export_import import ImportReport
from app.services.export_import_service import ExportImportService

export_import_router = APIRouter(prefix="/export-import", tags=["export-import"])

MAX_FILE_SIZE = 50 * 1024 * 1024


@export_import_router.get("/export")
async def export_data(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ExportImportService(db)
    result = await service.export_data(user_id=current_user.id)
    content = json.dumps(result, ensure_ascii=False, indent=2)
    filename = f"todowka_export_{datetime.now(UTC).strftime('%Y-%m-%d')}.json"
    return {"content": content, "filename": filename}


@export_import_router.post("/import", response_model=ImportReport)
async def import_data(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .json file",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit",
        )

    try:
        data = json.loads(content)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON file",
        ) from None

    if data.get("app") != "todowka":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export file: unsupported app",
        )

    if data.get("version") != "1.0":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export file: unsupported version",
        )

    if "data" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export file: missing data field",
        )

    service = ExportImportService(db)
    result = await service.import_data(user_id=current_user.id, import_data=data)
    return ImportReport(**result)
