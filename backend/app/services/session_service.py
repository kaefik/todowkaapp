import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.revoked_token import RevokedToken
from app.models.session import Session


class SessionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(
        self,
        user_id: str,
        refresh_jti: str,
        user_agent_raw: str | None,
        ip_address: str | None,
    ) -> Session:
        browser = None
        os_name = None
        device_type = None

        if user_agent_raw:
            try:
                from user_agents import parse

                ua = parse(user_agent_raw)
                browser = f"{ua.browser.family} {ua.browser.version_string}"
                os_name = f"{ua.os.family} {ua.os.version_string}"
                device_type = (
                    "mobile"
                    if ua.is_mobile
                    else ("tablet" if ua.is_tablet else "desktop")
                )
            except Exception:
                pass

        session = Session(
            id=str(uuid.uuid4()),
            user_id=user_id,
            refresh_token_jti=refresh_jti,
            user_agent_raw=user_agent_raw,
            browser=browser,
            os=os_name,
            device_type=device_type,
            ip_address=ip_address,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_user_sessions(self, user_id: str) -> list[Session]:
        result = await self.db.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(Session.last_activity.desc())
        )
        return list(result.scalars().all())

    async def revoke_session(self, session_id: str, user_id: str) -> None:
        result = await self.db.execute(
            select(Session).where(Session.id == session_id, Session.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        revoked = RevokedToken(token_jti=session.refresh_token_jti)
        self.db.add(revoked)
        await self.db.delete(session)
        await self.db.flush()

    async def revoke_all_sessions(self, user_id: str, current_jti: str) -> int:
        result = await self.db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.refresh_token_jti != current_jti,
            )
        )
        sessions = list(result.scalars().all())

        for session in sessions:
            revoked = RevokedToken(token_jti=session.refresh_token_jti)
            self.db.add(revoked)
            await self.db.delete(session)

        await self.db.flush()
        return len(sessions)

    async def update_activity(self, refresh_jti: str) -> None:
        result = await self.db.execute(
            select(Session).where(Session.refresh_token_jti == refresh_jti)
        )
        session = result.scalar_one_or_none()
        if session is not None:
            session.last_activity = datetime.now(UTC)
            await self.db.flush()

    async def delete_by_jti(self, refresh_jti: str) -> None:
        result = await self.db.execute(
            select(Session).where(Session.refresh_token_jti == refresh_jti)
        )
        session = result.scalar_one_or_none()
        if session is not None:
            await self.db.delete(session)
            await self.db.flush()

    async def cleanup_expired(self, days: int = 30) -> int:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        stmt = delete(Session).where(Session.last_activity < cutoff)
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount
