import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_validate_token_endpoint_exists():
    """Validate token endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/mattermost/validate-token", json={"token": "test"})
        assert resp.status_code != 404
