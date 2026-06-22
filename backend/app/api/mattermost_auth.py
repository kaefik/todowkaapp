from typing import Annotated

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.crypto_service import encrypt_secret

router = APIRouter(prefix="/mattermost", tags=["mattermost"])
logger = logging.getLogger(__name__)


class ValidateTokenRequest(BaseModel):
    token: str


class ValidateTokenResponse(BaseModel):
    valid: bool
    username: str | None = None


class BindRequest(BaseModel):
    mattermost_user_id: str


class BindResponse(BaseModel):
    success: bool
    message: str


@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_mattermost_token(
    req: ValidateTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Validate Mattermost bot token"""
    import httpx

    url = f"{settings.mattermost_url}/api/v4/users/me"
    logger.info(f"Validating Mattermost token against {url}")
    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {req.token}"}
            )
            logger.info(f"Mattermost validation response: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                return ValidateTokenResponse(valid=True, username=data.get("username"))
    except Exception as e:
        logger.error(f"Mattermost validation error: {e}")

    return ValidateTokenResponse(valid=False)


@router.post("/bind", response_model=BindResponse)
async def bind_mattermost_account(
    req: BindRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Bind Mattermost user ID to Todowka account"""
    current_user.mattermost_user_id = req.mattermost_user_id
    db.add(current_user)
    await db.commit()
    return BindResponse(success=True, message="Account bound successfully")


@router.post("/save-token")
async def save_mattermost_token(
    req: ValidateTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Save encrypted Mattermost bot token"""
    encrypted = encrypt_secret(req.token)
    current_user.mattermost_bot_token = encrypted
    db.add(current_user)
    await db.commit()
    return {"success": True}


@router.post("/logout")
async def mattermost_logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Clear Mattermost connection"""
    current_user.mattermost_user_id = None
    current_user.mattermost_bot_token = None
    current_user.mattermost_notifications_enabled = False
    current_user.mattermost_channel_id = None
    db.add(current_user)
    await db.commit()
    return {"success": True}
