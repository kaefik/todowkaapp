import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ["SECRET_KEY"] = "test-secret-key-32-chars-long"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REGISTRATION_ENABLED"] = "true"
os.environ["APP_ENV"] = "test"

from app.database import AsyncSessionLocal, Base, engine
from app.main import create_app


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
