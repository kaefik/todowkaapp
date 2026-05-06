import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_telegram_login_endpoint():
    """Test Telegram login endpoint responds"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/telegram/login",
            json={"init_data": "query_id=test"}
        )
        # Expect 401 (not linked) or 422 (validation error), but endpoint exists
        assert response.status_code in [200, 401, 422]


@pytest.mark.asyncio
async def test_telegram_bind_link_endpoint_requires_auth():
    """Test bind link requires authentication"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telegram/bind-link")
        # Expect 401 (not authenticated)
        assert response.status_code == 401