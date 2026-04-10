import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.task import Task
from app.models.user import User
from app.security import create_access_token


@pytest_asyncio.fixture
async def admin_user(db_session):
    admin = User(
        username="admin",
        email="admin@example.com",
        password_hash="hashed",
        is_admin=True,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def regular_user(db_session):
    user = User(
        username="regular",
        email="regular@example.com",
        password_hash="hashed",
        is_admin=False,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def blocked_user(db_session):
    user = User(
        username="blocked",
        email="blocked@example.com",
        password_hash="hashed",
        is_admin=False,
        is_active=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_with_tasks(db_session, regular_user):
    task1 = Task(
        user_id=regular_user.id,
        title="Task 1",
        is_completed=False,
    )
    task2 = Task(
        user_id=regular_user.id,
        title="Task 2",
        is_completed=True,
    )
    db_session.add_all([task1, task2])
    await db_session.commit()
    return regular_user


@pytest_asyncio.fixture
def admin_headers(admin_user):
    access_token = create_access_token({"sub": admin_user.id})
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
def user_headers(regular_user):
    access_token = create_access_token({"sub": regular_user.id})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.mark.asyncio
async def test_get_users_as_admin(client, admin_user, admin_headers):
    response = await client.get("/api/users", headers=admin_headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) == 1
    assert users[0]["username"] == "admin"
    assert users[0]["is_admin"] is True


@pytest.mark.asyncio
async def test_get_users_as_non_admin(client, regular_user, user_headers, admin_user):
    response = await client.get("/api/users", headers=user_headers)
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_block_user_success(client, admin_headers, regular_user):
    response = await client.patch(
        f"/api/users/{regular_user.id}/block",
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["id"] == regular_user.id


@pytest.mark.asyncio
async def test_block_yourself(client, admin_user, admin_headers):
    response = await client.patch(
        f"/api/users/{admin_user.id}/block",
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Cannot block yourself" in response.json()["detail"]


@pytest.mark.asyncio
async def test_block_admin_user(client, admin_headers, db_session):
    another_admin = User(
        username="admin2",
        email="admin2@example.com",
        password_hash="hashed",
        is_admin=True,
        is_active=True,
    )
    db_session.add(another_admin)
    await db_session.commit()

    response = await client.patch(
        f"/api/users/{another_admin.id}/block",
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Cannot block admin user" in response.json()["detail"]


@pytest.mark.asyncio
async def test_block_nonexistent_user(client, admin_headers):
    response = await client.patch(
        "/api/users/nonexistent-id/block",
        headers=admin_headers,
    )
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_unblock_user_success(client, admin_headers, blocked_user):
    response = await client.patch(
        f"/api/users/{blocked_user.id}/unblock",
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is True
    assert data["id"] == blocked_user.id


@pytest.mark.asyncio
async def test_unblock_nonexistent_user(client, admin_headers):
    response = await client.patch(
        "/api/users/nonexistent-id/unblock",
        headers=admin_headers,
    )
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_user_success(client, admin_headers, user_with_tasks, db_session):
    user_id = user_with_tasks.id

    response = await client.delete(
        f"/api/users/{user_id}",
        headers=admin_headers,
    )
    assert response.status_code == 204

    result = await db_session.execute(select(User).where(User.id == user_id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_yourself(client, admin_user, admin_headers):
    response = await client.delete(
        f"/api/users/{admin_user.id}",
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Cannot delete yourself" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_admin_user(client, admin_headers, db_session):
    another_admin = User(
        username="admin2",
        email="admin2@example.com",
        password_hash="hashed",
        is_admin=True,
        is_active=True,
    )
    db_session.add(another_admin)
    await db_session.commit()

    response = await client.delete(
        f"/api/users/{another_admin.id}",
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Cannot delete admin user" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_nonexistent_user(client, admin_headers):
    response = await client.delete(
        "/api/users/nonexistent-id",
        headers=admin_headers,
    )
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]
