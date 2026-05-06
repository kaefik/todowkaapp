import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.telegram_auth_service import TelegramAuthService


@pytest.mark.asyncio
async def test_validate_init_data_no_bot_token():
    """Test with no bot token configured"""
    mock_db = AsyncMock()
    service = TelegramAuthService(mock_db)
    service.bot_token = ""
    
    result = await service.validate_init_data("query_id=test")
    
    assert result["valid"] is False
    assert "Bot token not configured" in result["error"]


@pytest.mark.asyncio
async def test_generate_bind_token():
    """Test bind token generation"""
    mock_db = AsyncMock()
    service = TelegramAuthService(mock_db)
    
    with patch("app.services.telegram_auth_service.settings") as mock_settings:
        mock_settings.secret_key = "test_secret"
        
        token = service._generate_bind_token("user-123")
        
        assert len(token) == 32
        assert token.isalnum()


@pytest.mark.asyncio
async def test_parse_init_data():
    """Test init data parsing"""
    mock_db = AsyncMock()
    service = TelegramAuthService(mock_db)
    
    parsed = service._parse_init_data("query_id=abc&user={\"id\":123}&auth_date=123456")
    
    assert parsed is not None
    assert parsed["query_id"] == "abc"
    assert parsed["user"]["id"] == 123
    assert parsed["auth_date"] == "123456"