from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.session import RevokeAllRequest, SessionListResponse, SessionResponse
from app.services.session_service import SessionService

sessions_router = APIRouter(prefix="/sessions", tags=["sessions"])


@sessions_router.get("", response_model=SessionListResponse)
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_session_id: str | None = Query(default=None),
) -> SessionListResponse:
    service = SessionService(db)
    sessions = await service.get_user_sessions(str(current_user.id))
    items = []
    for s in sessions:
        items.append(
            SessionResponse(
                id=s.id,
                browser=s.browser,
                os=s.os,
                device_type=s.device_type,
                ip_address=s.ip_address,
                created_at=s.created_at,
                last_activity=s.last_activity,
                is_current=(s.id == current_session_id),
            )
        )
    return SessionListResponse(items=items)


@sessions_router.delete("/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, bool]:
    service = SessionService(db)
    await service.revoke_session(session_id, str(current_user.id))
    await db.commit()
    return {"success": True}


@sessions_router.delete("")
async def revoke_all_sessions(
    data: RevokeAllRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    service = SessionService(db)
    revoked_count = await service.revoke_all_sessions(
        str(current_user.id), current_jti=data.current_session_id
    )
    await db.commit()
    return {"success": True, "revoked_count": revoked_count}
