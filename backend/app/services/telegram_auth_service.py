import hashlib
import hmac
import json
import logging
import time
from datetime import timedelta
from typing import Any
from urllib.parse import parse_qsl

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.security import create_access_token

logger = logging.getLogger(__name__)


class TelegramAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.bot_token = getattr(settings, 'telegram_bot_token', None) or ''

    def _validate_hash(self, init_data: str) -> bool:
        """Проверяет HMAC-SHA256 подпись initData"""
        try:
            params = dict(parse_qsl(init_data, keep_blank_values=True))
            hash_value = params.pop("hash", None)
            if not hash_value:
                return False

            data_check = "\n".join(
                f"{k}={v}" for k, v in sorted(params.items())
            )

            secret_key = hmac.new(
                b"WebAppData", self.bot_token.encode(), hashlib.sha256
            ).digest()

            computed = hmac.new(
                secret_key, data_check.encode(), hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(computed, hash_value)
        except Exception:
            logger.error("Failed to validate hash", exc_info=True)
            return False

    def _check_auth_date(self, init_data: str) -> bool:
        """Проверяет что auth_date не старше 5 минут"""
        try:
            params = dict(parse_qsl(init_data, keep_blank_values=True))
            auth_date_str = params.get("auth_date")
            if not auth_date_str:
                return False
            auth_date = int(auth_date_str)
            return (time.time() - auth_date) <= 300
        except (ValueError, TypeError):
            return False

    async def validate_init_data(self, init_data: str) -> dict[str, Any]:
        """Валидирует initData через HMAC-SHA256"""
        if not self.bot_token:
            return {"valid": False, "error": "Bot token not configured"}

        if not self._validate_hash(init_data):
            return {"valid": False, "error": "Invalid hash"}

        if not self._check_auth_date(init_data):
            return {"valid": False, "error": "Auth date expired"}

        parsed = self._parse_init_data(init_data)
        if not parsed:
            return {"valid": False, "error": "Invalid init data format"}

        return {
            "valid": True,
            "user_id": parsed.get("user", {}).get("id", 0),
            "auth_date": parsed.get("auth_date", 0),
        }

    def _parse_init_data(self, init_data: str) -> dict[str, Any] | None:
        """Парсит initData строку от Telegram"""
        try:
            result: dict[str, Any] = {}
            for item in init_data.split("&"):
                if "=" in item:
                    key, value = item.split("=", 1)
                    if key == "user":
                        value = json.loads(value)
                    result[key] = value
            return result
        except Exception:
            logger.error("Failed to parse init data", exc_info=True)
            return None

    async def login_via_telegram(self, init_data: str) -> dict[str, Any]:
        """Аутентификация через Telegram"""
        validation = await self.validate_init_data(init_data)
        if not validation.get("valid"):
            raise ValueError(validation.get("error", "Invalid Telegram data"))

        telegram_user_id = validation.get("user_id", 0)
        if not telegram_user_id:
            raise ValueError("User not found in Telegram data")

        result = await self.db.execute(
            select(User).where(User.telegram_chat_id == str(telegram_user_id))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Account not linked. Please bind your Telegram account first.")

        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=timedelta(minutes=5)
        )

        return {
            "access_token": access_token,
            "user": user,
        }

    async def bind_account(self, user_id: str, telegram_chat_id: str, token: str) -> bool:
        """Привязка аккаунта к Telegram"""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            return False

        expected_hash = self._generate_bind_token(user_id)
        if token != expected_hash:
            return False

        user.telegram_chat_id = telegram_chat_id
        await self.db.commit()

        return True

    def _generate_bind_token(self, user_id: str) -> str:
        """Генерирует токен для привязки"""
        secret = getattr(settings, 'secret_key', 'default')
        return hmac.new(
            secret.encode(),
            f"bind:{user_id}".encode(),
            hashlib.sha256
        ).hexdigest()[:32]

    async def generate_bind_link(self, user_id: str) -> str:
        """Генерирует ссылку для привязки аккаунта"""
        token = self._generate_bind_token(user_id)
        return f"https://t.me/{getattr(settings, 'telegram_bot_username', 'TodowkaBot')}?start={token}"
