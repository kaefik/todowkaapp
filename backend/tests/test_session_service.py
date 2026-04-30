import uuid
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.revoked_token import RevokedToken
from app.models.session import Session
from app.models.user import User
from app.services.session_service import SessionService


@pytest_asyncio.fixture
async def test_user(db_session):
    user = User(
        id=str(uuid.uuid4()),
        username="sessionuser",
        email="session@example.com",
        password_hash="fakehash",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def test_user2(db_session):
    user = User(
        id=str(uuid.uuid4()),
        username="sessionuser2",
        email="session2@example.com",
        password_hash="fakehash",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_create_session(db_session, test_user):
    service = SessionService(db_session)
    jti = str(uuid.uuid4())
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"

    session = await service.create_session(
        user_id=test_user.id,
        refresh_jti=jti,
        user_agent_raw=ua,
        ip_address="127.0.0.1",
    )

    assert session.id is not None
    assert session.user_id == test_user.id
    assert session.refresh_token_jti == jti
    assert session.ip_address == "127.0.0.1"
    if session.browser is not None:
        assert "Chrome" in session.browser
        assert session.os is not None
        assert session.device_type == "desktop"
    assert session.created_at is not None
    assert session.last_activity is not None


@pytest.mark.asyncio
async def test_create_session_no_ua(db_session, test_user):
    service = SessionService(db_session)
    jti = str(uuid.uuid4())

    session = await service.create_session(
        user_id=test_user.id,
        refresh_jti=jti,
        user_agent_raw=None,
        ip_address=None,
    )

    assert session.browser is None
    assert session.os is None
    assert session.device_type is None
    assert session.ip_address is None


@pytest.mark.asyncio
async def test_get_user_sessions_ordered(db_session, test_user):
    service = SessionService(db_session)

    s1 = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=str(uuid.uuid4()),
        last_activity=datetime.now(UTC) - timedelta(hours=2),
    )
    s2 = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=str(uuid.uuid4()),
        last_activity=datetime.now(UTC),
    )
    db_session.add_all([s1, s2])
    await db_session.flush()

    sessions = await service.get_user_sessions(test_user.id)
    assert len(sessions) == 2
    assert sessions[0].id == s2.id
    assert sessions[1].id == s1.id


@pytest.mark.asyncio
async def test_get_user_sessions_filters_by_user(db_session, test_user, test_user2):
    service = SessionService(db_session)

    db_session.add(
        Session(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            refresh_token_jti=str(uuid.uuid4()),
        )
    )
    db_session.add(
        Session(
            id=str(uuid.uuid4()),
            user_id=test_user2.id,
            refresh_token_jti=str(uuid.uuid4()),
        )
    )
    await db_session.flush()

    sessions = await service.get_user_sessions(test_user.id)
    assert len(sessions) == 1


@pytest.mark.asyncio
async def test_revoke_session(db_session, test_user):
    service = SessionService(db_session)
    jti = str(uuid.uuid4())
    session = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=jti,
    )
    db_session.add(session)
    await db_session.flush()
    session_id = session.id

    await service.revoke_session(session_id, test_user.id)

    result = await db_session.execute(select(Session).where(Session.id == session_id))
    assert result.scalar_one_or_none() is None

    revoked = await db_session.execute(select(RevokedToken).where(RevokedToken.token_jti == jti))
    assert revoked.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_revoke_session_not_found(db_session, test_user):
    service = SessionService(db_session)

    with pytest.raises(Exception) as exc_info:
        await service.revoke_session(str(uuid.uuid4()), test_user.id)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_revoke_session_wrong_user(db_session, test_user, test_user2):
    service = SessionService(db_session)
    session = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=str(uuid.uuid4()),
    )
    db_session.add(session)
    await db_session.flush()

    with pytest.raises(Exception) as exc_info:
        await service.revoke_session(session.id, test_user2.id)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_revoke_all_sessions(db_session, test_user):
    service = SessionService(db_session)
    current_jti = str(uuid.uuid4())
    other_jti = str(uuid.uuid4())

    db_session.add(
        Session(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            refresh_token_jti=current_jti,
        )
    )
    db_session.add(
        Session(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            refresh_token_jti=other_jti,
        )
    )
    await db_session.flush()

    count = await service.revoke_all_sessions(test_user.id, current_jti)

    assert count == 1

    result = await db_session.execute(
        select(Session).where(Session.refresh_token_jti == current_jti)
    )
    assert result.scalar_one_or_none() is not None

    result = await db_session.execute(
        select(Session).where(Session.refresh_token_jti == other_jti)
    )
    assert result.scalar_one_or_none() is None

    revoked = await db_session.execute(select(RevokedToken).where(RevokedToken.token_jti == other_jti))
    assert revoked.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_update_activity(db_session, test_user):
    service = SessionService(db_session)
    jti = str(uuid.uuid4())
    old_time = datetime.now(UTC) - timedelta(hours=1)
    session = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=jti,
        last_activity=old_time,
    )
    db_session.add(session)
    await db_session.flush()

    await service.update_activity(jti)

    result = await db_session.execute(select(Session).where(Session.id == session.id))
    updated = result.scalar_one()
    assert updated.last_activity > old_time


@pytest.mark.asyncio
async def test_update_activity_no_session(db_session):
    service = SessionService(db_session)
    await service.update_activity(str(uuid.uuid4()))


@pytest.mark.asyncio
async def test_cleanup_expired(db_session, test_user):
    service = SessionService(db_session)

    old_session = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=str(uuid.uuid4()),
        last_activity=datetime.now(UTC) - timedelta(days=60),
    )
    recent_session = Session(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        refresh_token_jti=str(uuid.uuid4()),
        last_activity=datetime.now(UTC),
    )
    db_session.add_all([old_session, recent_session])
    await db_session.flush()

    deleted = await service.cleanup_expired(days=30)

    assert deleted == 1
    result = await db_session.execute(select(Session).where(Session.user_id == test_user.id))
    remaining = list(result.scalars().all())
    assert len(remaining) == 1
    assert remaining[0].id == recent_session.id
