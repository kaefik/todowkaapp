import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_mattermost_settings_get_endpoint_exists():
    """Mattermost settings GET endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/settings/mattermost")
        assert resp.status_code != 404


@pytest.mark.asyncio
async def test_mattermost_settings_put_endpoint_exists():
    """Mattermost settings PUT endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.put("/api/settings/mattermost", json={
            "mattermost_url": "http://localhost:8065",
            "mattermost_bot_token": "test-token"
        })
        assert resp.status_code != 404
