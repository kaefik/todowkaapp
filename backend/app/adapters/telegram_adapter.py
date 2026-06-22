from typing import Optional

from app.interfaces.bot_interface import BotInterface
from app.services.telegram_notifier import TelegramNotifierService


class TelegramBotAdapter(BotInterface):
    """Adapter wrapping existing TelegramNotifierService"""

    def __init__(self, bot_token: str):
        self.bot_token = bot_token

    async def send_message(
        self,
        user_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
        reply_to: Optional[str] = None,
    ) -> str:
        reply_markup = None
        if buttons:
            reply_markup = {"inline_keyboard": [buttons]}
        result = await TelegramNotifierService.send_message_with_buttons(
            self.bot_token, user_id, text, reply_markup
        )
        return str(result.get("message_id", "")) if result else ""

    async def edit_message(
        self,
        user_id: str,
        message_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
    ) -> bool:
        reply_markup = None
        if buttons:
            reply_markup = {"inline_keyboard": [buttons]}
        result = await TelegramNotifierService.edit_message_text(
            self.bot_token, user_id, int(message_id), text, reply_markup
        )
        return result is not None

    async def send_document(
        self,
        user_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        result = await TelegramNotifierService.send_document(
            self.bot_token, user_id, filename, content
        )
        return str(result.get("message_id", "")) if result else ""

    async def answer_callback(
        self,
        callback_id: str,
        text: Optional[str] = None,
    ) -> bool:
        return await TelegramNotifierService.answer_callback_query(
            self.bot_token, callback_id, text or ""
        )

    async def remove_keyboard(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        return await TelegramNotifierService.edit_message_text(
            self.bot_token, user_id, int(message_id),
            " ", None
        ) is not None
