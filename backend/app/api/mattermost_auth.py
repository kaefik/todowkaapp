import logging
from typing import Annotated

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
    mattermost_url: str | None = None


class ValidateTokenResponse(BaseModel):
    valid: bool
    username: str | None = None
    mattermost_user_id: str | None = None


class BindRequest(BaseModel):
    mattermost_user_id: str


class BindResponse(BaseModel):
    success: bool
    message: str


class BotBindRequest(BaseModel):
    email: str


class BotBindResponse(BaseModel):
    found: bool
    mattermost_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None
    error: str | None = None


class BotConfirmRequest(BaseModel):
    mattermost_user_id: str
    email: str


class BotStatusResponse(BaseModel):
    bound: bool
    bind_mode: str
    email: str | None = None
    mattermost_user_id: str | None = None
    username: str | None = None
    notifications_enabled: bool


@router.post("/bot/bind", response_model=BotBindResponse)
async def bot_bind(
    req: BotBindRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Find Mattermost user by email using bot token"""
    bot_token = current_user.decrypted_mattermost_bot_token or settings.mattermost_bot_token
    if not bot_token:
        return BotBindResponse(found=False, error="Mattermost bot token not configured")

    mattermost_url = current_user.mattermost_url or settings.mattermost_url
    from app.adapters.mattermost_adapter import MattermostBotAdapter
    adapter = MattermostBotAdapter(mattermost_url, bot_token)
    user_data = await adapter.get_user_by_email(req.email)

    if not user_data:
        return BotBindResponse(found=False, error="User not found in Mattermost")

    display_name = " ".join(filter(None, [user_data.get("first_name"), user_data.get("last_name")]))

    return BotBindResponse(
        found=True,
        mattermost_user_id=user_data["id"],
        username=user_data["username"],
        display_name=display_name or None,
    )


@router.post("/bot/confirm", response_model=BindResponse)
async def bot_confirm(
    req: BotConfirmRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Confirm bot binding — save Mattermost user ID and email"""
    current_user.mattermost_user_id = req.mattermost_user_id
    current_user.mattermost_email = req.email
    current_user.mattermost_bind_mode = 'bot'
    current_user.mattermost_notifications_enabled = True
    db.add(current_user)
    await db.commit()
    return BindResponse(success=True, message="Mattermost account bound successfully")


@router.post("/bot/status", response_model=BotStatusResponse)
async def bot_status(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get current bot binding status"""
    return BotStatusResponse(
        bound=bool(current_user.mattermost_user_id and current_user.mattermost_bind_mode == 'bot'),
        bind_mode=current_user.mattermost_bind_mode or 'pat',
        email=current_user.mattermost_email,
        mattermost_user_id=current_user.mattermost_user_id,
        notifications_enabled=current_user.mattermost_notifications_enabled,
    )


@router.post("/bot/unbind", response_model=BindResponse)
async def bot_unbind(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Unbind bot — reset to PAT mode"""
    current_user.mattermost_user_id = None
    current_user.mattermost_email = None
    current_user.mattermost_bind_mode = 'pat'
    current_user.mattermost_notifications_enabled = False
    db.add(current_user)
    await db.commit()
    return BindResponse(success=True, message="Mattermost account unbound")


@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_mattermost_token(
    req: ValidateTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Validate Mattermost bot token and save user ID for DM notifications"""
    import httpx

    base_url = req.mattermost_url or settings.mattermost_url
    url = f"{base_url.rstrip('/')}/api/v4/users/me"
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
                mm_user_id = data.get("id")
                if mm_user_id:
                    current_user.mattermost_user_id = mm_user_id
                    if req.mattermost_url:
                        current_user.mattermost_url = req.mattermost_url
                    db.add(current_user)
                    await db.commit()
                return ValidateTokenResponse(valid=True, username=data.get("username"), mattermost_user_id=mm_user_id)
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
