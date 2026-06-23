import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_bot_bind_endpoint_exists():
    """Bot bind endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/mattermost/bot/bind", json={"email": "test@example.com"})
        assert resp.status_code != 404


@pytest.mark.asyncio
async def test_bot_status_endpoint_exists():
    """Bot status endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/mattermost/bot/status")
        assert resp.status_code != 404


@pytest.mark.asyncio
async def test_bot_confirm_endpoint_exists():
    """Bot confirm endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/mattermost/bot/confirm", json={
            "mattermost_user_id": "abc123",
            "email": "test@example.com"
        })
        assert resp.status_code != 404


@pytest.mark.asyncio
async def test_bot_unbind_endpoint_exists():
    """Bot unbind endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/mattermost/bot/unbind")
        assert resp.status_code != 404
