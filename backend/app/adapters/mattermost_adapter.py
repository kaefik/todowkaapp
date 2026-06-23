import logging

import httpx

from app.interfaces.bot_interface import BotInterface

logger = logging.getLogger(__name__)

HTTPX_TIMEOUT = 10.0


class MattermostBotAdapter(BotInterface):
    """Adapter for Mattermost API"""

    def __init__(self, mattermost_url: str, bot_token: str):
        self.mattermost_url = mattermost_url.rstrip("/")
        self.bot_token = bot_token
        self.ws_client = None

    @property
    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.bot_token}"}

    async def get_current_user_id(self) -> str:
        """Get the user ID of the token owner"""
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.get(
                    f"{self.mattermost_url}/api/v4/users/me",
                    headers=self._headers,
                )
                if resp.status_code == 200:
                    return resp.json().get("id", "")
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost get_current_user_id error: {e}")
        return ""

    async def get_user_by_email(self, email: str) -> dict | None:
        """Find Mattermost user by email"""
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.get(
                    f"{self.mattermost_url}/api/v4/users/email/{email}",
                    headers=self._headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "id": data.get("id", ""),
                        "username": data.get("username", ""),
                        "email": data.get("email", ""),
                        "first_name": data.get("first_name", ""),
                        "last_name": data.get("last_name", ""),
                    }
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost get_user_by_email error: {e}")
        return None

    async def get_or_create_dm_channel(self, target_user_id: str) -> str:
        """Get or create a DM channel with the target user. Returns channel_id."""
        my_user_id = await self.get_current_user_id()
        if not my_user_id:
            logger.warning("Cannot get current user ID for DM channel")
            return ""

        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.mattermost_url}/api/v4/channels/direct",
                    headers=self._headers,
                    json=[my_user_id, target_user_id],
                )
                if resp.status_code in (200, 201):
                    return resp.json().get("id", "")
                logger.warning(f"Mattermost create DM channel failed: {resp.status_code} {resp.text}")
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost get_or_create_dm_channel error: {e}")
        return ""

    async def send_message(
        self,
        user_id: str,
        text: str,
        buttons: list[dict[str, str]] | None = None,
        reply_to: str | None = None,
    ) -> str:
        payload = {
            "channel_id": user_id,
            "message": text,
        }
        if reply_to:
            payload["root_id"] = reply_to

        if buttons:
            attachments = [{
                "actions": [
                    {
                        "name": btn.get("text", ""),
                        "type": "button",
                        "integration": {
                            "url": "",
                            "context": {
                                "action": btn.get("callback_data", ""),
                            },
                        },
                    }
                    for btn in buttons
                ]
            }]
            payload["props"] = {"attachments": attachments}

        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.mattermost_url}/api/v4/posts",
                    headers=self._headers,
                    json=payload,
                )
                data = resp.json()
                return data.get("id", "")
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost send_message error: {e}")
            return ""

    async def edit_message(
        self,
        user_id: str,
        message_id: str,
        text: str,
        buttons: list[dict[str, str]] | None = None,
    ) -> bool:
        payload = {"message": text}
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.put(
                    f"{self.mattermost_url}/api/v4/posts/{message_id}",
                    headers=self._headers,
                    json=payload,
                )
                return resp.status_code == 200
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost edit_message error: {e}")
            return False

    async def send_document(
        self,
        user_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                files = {"files": (filename, content)}
                resp = await client.post(
                    f"{self.mattermost_url}/api/v4/files",
                    headers=self._headers,
                    files=files,
                )
                file_info = resp.json()
                file_id = file_info[0].get("id", "") if file_info else ""

                if file_id:
                    post_payload = {
                        "channel_id": user_id,
                        "message": filename,
                        "file_ids": [file_id],
                    }
                    resp = await client.post(
                        f"{self.mattermost_url}/api/v4/posts",
                        headers=self._headers,
                        json=post_payload,
                    )
                    data = resp.json()
                    return data.get("id", "")
                return ""
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost send_document error: {e}")
            return ""

    async def answer_callback(
        self,
        callback_id: str,
        text: str | None = None,
    ) -> bool:
        # Mattermost handles action responses via response_url
        # This is a no-op for compatibility
        return True

    async def remove_keyboard(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        # Mattermost doesn't support removing keyboards
        # This is a no-op for compatibility
        return True

    async def connect_websocket(self, event_handler):
        """Connect to Mattermost WebSocket for real-time events"""
        try:
            from mattermostdriver import Driver

            driver = Driver({
                'url': self.mattermost_url,
                'token': self.bot_token,
                'scheme': 'http' if 'localhost' in self.mattermost_url else 'https',
            })
            driver.login()
            self.ws_client = driver

            def on_message(event):
                import asyncio
                asyncio.get_event_loop().create_task(event_handler(event))

            driver.websocket.on('posted', on_message)
            driver.websocket.on('action', on_message)
            driver.websocket.connect()
            return True
        except Exception as e:
            logger.warning(f"Mattermost WebSocket connection failed: {e}")
            return False
