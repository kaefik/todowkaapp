import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

    def subscribe(self, user_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        self._subscribers[user_id].append(queue)
        logger.debug(f"SSE subscriber added for user {user_id}, total: {len(self._subscribers[user_id])}")
        return queue

    def unsubscribe(self, user_id: str, queue: asyncio.Queue) -> None:
        if user_id in self._subscribers:
            try:
                self._subscribers[user_id].remove(queue)
                if not self._subscribers[user_id]:
                    del self._subscribers[user_id]
                logger.debug(f"SSE subscriber removed for user {user_id}, total: {len(self._subscribers.get(user_id, []))}")
            except ValueError:
                pass

    async def publish(self, user_id: str, event_type: str, data: dict) -> None:
        queues = self._subscribers.get(user_id, [])
        if not queues:
            return
        event = {"type": event_type, "data": data}
        for queue in queues:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                    queue.put_nowait({"type": "queue_overflow", "data": {}})
                except Exception:
                    pass

    def get_subscriber_count(self, user_id: str) -> int:
        return len(self._subscribers.get(user_id, []))

    def cleanup_user(self, user_id: str) -> None:
        if user_id in self._subscribers:
            del self._subscribers[user_id]
            logger.debug(f"Cleaned up all subscribers for user {user_id}")


event_bus = EventBus()
