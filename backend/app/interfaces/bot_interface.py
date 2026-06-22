from abc import ABC, abstractmethod


class BotInterface(ABC):
    """Abstract interface for all bots"""

    @abstractmethod
    async def send_message(
        self,
        user_id: str,
        text: str,
        buttons: list[dict[str, str]] | None = None,
        reply_to: str | None = None,
    ) -> str:
        """Send a message. Returns message_id."""
        ...

    @abstractmethod
    async def edit_message(
        self,
        user_id: str,
        message_id: str,
        text: str,
        buttons: list[dict[str, str]] | None = None,
    ) -> bool:
        """Edit an existing message."""
        ...

    @abstractmethod
    async def send_document(
        self,
        user_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        """Send a file attachment. Returns message_id."""
        ...

    @abstractmethod
    async def answer_callback(
        self,
        callback_id: str,
        text: str | None = None,
    ) -> bool:
        """Answer a callback query (button press)."""
        ...

    @abstractmethod
    async def remove_keyboard(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        """Remove inline keyboard from a message."""
        ...
