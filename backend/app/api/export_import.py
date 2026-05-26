import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import export_limit, limiter
from app.schemas.export_import import ImportReport
from app.services.export_import_service import ExportImportService

export_import_router = APIRouter(prefix="/export-import", tags=["export-import"])

MAX_FILE_SIZE = 50 * 1024 * 1024


def _build_zip(data: dict) -> io.BytesIO:
    json_parts: list[str] = []
    from app.services.export_import_service import _stream_json_chunks

    for chunk in _stream_json_chunks(data):
        json_parts.append(chunk)
    json_bytes = "".join(json_parts).encode("utf-8")

    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    json_filename = f"todowka_export_{date_str}.json"

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(json_filename, json_bytes)
    zip_buf.seek(0)
    return zip_buf


@export_import_router.get("/export")
@limiter.limit(export_limit)
async def export_data(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ExportImportService(db)
    data = await service.preload_export_data(user_id=current_user.id)
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    zip_filename = f"todowka_export_{date_str}.zip"
    zip_buf = _build_zip(data)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


@export_import_router.post("/import", response_model=ImportReport)
@limiter.limit(export_limit)
async def import_data(
    request: Request,
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not file.filename or not (
        file.filename.endswith(".json") or file.filename.endswith(".zip")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .json or .zip file",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit",
        )

    if file.filename.endswith(".zip"):
        try:
            zip_buf = io.BytesIO(content)
            with zipfile.ZipFile(zip_buf, "r") as zf:
                json_names = [n for n in zf.namelist() if n.endswith(".json")]
                if not json_names:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="ZIP archive does not contain a .json file",
                    )
                json_content = zf.read(json_names[0])
            data = json.loads(json_content)
        except HTTPException:
            raise
        except (zipfile.BadZipFile, json.JSONDecodeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ZIP archive or JSON inside",
            ) from None
    else:
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
