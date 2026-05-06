import pytest
from app.schemas.telegram_auth import TelegramLoginRequest, TelegramLoginResponse, TelegramBindRequest

def test_telegram_login_request_schema():
    data = {"init_data": "query_id=xxx&user={\"id\":123}&auth_date=1234567890"}
    request = TelegramLoginRequest.model_validate(data)
    assert request.init_data == data["init_data"]

def test_telegram_bind_request_schema():
    data = {"token": "abc123token"}
    request = TelegramBindRequest.model_validate(data)
    assert request.token == "abc123token"