import hashlib
import hmac
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.security import create_access_token, create_refresh_token


class TelegramAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.bot_token = getattr(settings, 'telegram_bot_token', None) or ''
    
    async def validate_init_data(self, init_data: str) -> dict[str, Any]:
        """Валидирует initData через Telegram Bot API"""
        if not self.bot_token:
            return {"valid": False, "error": "Bot token not configured"}
        
        try:
            parsed = self._parse_init_data(init_data)
            if not parsed:
                return {"valid": False, "error": "Invalid init data format"}
            
            auth_date = parsed.get("auth_date", 0)
            query_id = parsed.get("query_id", "")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{self.bot_token}/respondWebAppQuery",
                    json={
                        "web_app_query_id": query_id,
                        "data": "valid"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        return {
                            "valid": True,
                            "user_id": parsed.get("user", {}).get("id", 0),
                            "auth_date": auth_date
                        }
        except Exception as e:
            pass
        
        return {"valid": False, "error": "Invalid init data"}
    
    def _parse_init_data(self, init_data: str) -> Optional[dict[str, Any]]:
        """Парсит initData строку от Telegram"""
        try:
            result = {}
            for item in init_data.split("&"):
                if "=" in item:
                    key, value = item.split("=", 1)
                    if key == "user":
                        import json
                        value = json.loads(value)
                    result[key] = value
            return result
        except:
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
        
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user
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