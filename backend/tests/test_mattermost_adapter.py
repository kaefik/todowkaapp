import pytest
from unittest.mock import AsyncMock, patch
from app.adapters.mattermost_adapter import MattermostBotAdapter


@pytest.fixture
def adapter():
    return MattermostBotAdapter(
        mattermost_url="http://localhost:8065",
        bot_token="test-bot-token"
    )


def test_adapter_initialization(adapter):
    """Adapter initializes with correct config"""
    assert adapter.mattermost_url == "http://localhost:8065"
    assert adapter.bot_token == "test-bot-token"


@pytest.mark.asyncio
async def test_send_message_returns_empty_on_error(adapter):
    """send_message returns empty string on connection error"""
    result = await adapter.send_message("user123", "Hello")
    assert result == ""


@pytest.mark.asyncio
async def test_answer_callback_returns_true(adapter):
    """answer_callback returns True (no-op)"""
    result = await adapter.answer_callback("callback123")
    assert result is True


@pytest.mark.asyncio
async def test_remove_keyboard_returns_true(adapter):
    """remove_keyboard returns True (no-op)"""
    result = await adapter.remove_keyboard("user123", "msg123")
    assert result is True
