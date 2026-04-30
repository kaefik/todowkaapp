import uuid

import pytest
import pytest_asyncio

from app.models.project import Project
from app.models.task import GtdStatus, Task
from app.models.user import User
from app.services.review_service import ReviewService


@pytest_asyncio.fixture
async def test_user(db_session):
    user = User(
        id=str(uuid.uuid4()),
        username="reviewuser",
        email="review@example.com",
        password_hash="fakehash",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def review_service(db_session):
    return ReviewService(db_session)


def _make_task(user_id, gtd_status, title="Task", **kwargs):
    return Task(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
        gtd_status=gtd_status,
        **kwargs,
    )


@pytest.mark.asyncio
async def test_get_review_status(db_session, test_user, review_service):
    db_session.add(
        _make_task(test_user.id, GtdStatus.INBOX.value, title="Inbox 1")
    )
    db_session.add(
        _make_task(test_user.id, GtdStatus.SOMEDAY.value, title="Someday 1")
    )
    await db_session.flush()

    status = await review_service.get_review_status(test_user.id)

    assert status["inbox_count"] == 1
    assert len(status["inbox_tasks"]) == 1
    assert status["inbox_tasks"][0]["title"] == "Inbox 1"
    assert len(status["someday_tasks"]) == 1
    assert status["someday_tasks"][0]["title"] == "Someday 1"
    assert status["review_count"] == 0
    assert status["last_review_date"] is None


@pytest.mark.asyncio
async def test_get_review_status_inbox_count(db_session, test_user, review_service):
    for i in range(3):
        db_session.add(
            _make_task(test_user.id, GtdStatus.INBOX.value, title=f"Inbox {i}")
        )
    db_session.add(
        _make_task(test_user.id, GtdStatus.NEXT.value, title="Not inbox")
    )
    await db_session.flush()

    status = await review_service.get_review_status(test_user.id)

    assert status["inbox_count"] == 3
    assert len(status["inbox_tasks"]) == 3


@pytest.mark.asyncio
async def test_get_review_status_projects_with_next_action(db_session, test_user, review_service):
    proj = Project(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        name="Active Project",
        is_active=True,
    )
    proj2 = Project(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        name="Empty Project",
        is_active=True,
    )
    db_session.add_all([proj, proj2])
    await db_session.flush()

    db_session.add(
        Task(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            title="Next action",
            gtd_status=GtdStatus.NEXT.value,
            project_id=proj.id,
        )
    )
    await db_session.flush()

    status = await review_service.get_review_status(test_user.id)

    projects = status["active_projects"]
    assert len(projects) == 2
    active_proj = next(p for p in projects if p["name"] == "Active Project")
    empty_proj = next(p for p in projects if p["name"] == "Empty Project")
    assert active_proj["has_next_action"] is True
    assert empty_proj["has_next_action"] is False


@pytest.mark.asyncio
async def test_get_review_status_someday_tasks(db_session, test_user, review_service):
    db_session.add(
        _make_task(test_user.id, GtdStatus.SOMEDAY.value, title="Someday A")
    )
    db_session.add(
        _make_task(test_user.id, GtdStatus.SOMEDAY.value, title="Someday B")
    )
    db_session.add(
        _make_task(test_user.id, GtdStatus.INBOX.value, title="Inbox")
    )
    await db_session.flush()

    status = await review_service.get_review_status(test_user.id)

    assert len(status["someday_tasks"]) == 2
    titles = [t["title"] for t in status["someday_tasks"]]
    assert "Someday A" in titles
    assert "Someday B" in titles


@pytest.mark.asyncio
async def test_get_review_status_inactive_projects_excluded(db_session, test_user, review_service):
    db_session.add(
        Project(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            name="Inactive",
            is_active=False,
        )
    )
    await db_session.flush()

    status = await review_service.get_review_status(test_user.id)

    assert len(status["active_projects"]) == 0


@pytest.mark.asyncio
async def test_complete_review(db_session, test_user, review_service):
    result = await review_service.complete_review(test_user.id)

    assert result["success"] is True
    assert result["review_count"] == 1
    assert result["completed_at"] is not None

    await db_session.refresh(test_user)
    assert test_user.review_count == 1
    assert test_user.last_review_at is not None


@pytest.mark.asyncio
async def test_complete_review_increments_count(db_session, test_user, review_service):
    await review_service.complete_review(test_user.id)
    result = await review_service.complete_review(test_user.id)

    assert result["review_count"] == 2
    await db_session.refresh(test_user)
    assert test_user.review_count == 2


@pytest.mark.asyncio
async def test_complete_review_user_not_found(db_session, review_service):
    result = await review_service.complete_review(uuid.uuid4())

    assert result["success"] is False
    assert "error" in result
