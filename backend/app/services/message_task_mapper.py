import threading
from datetime import UTC, datetime, timedelta

_TTL = timedelta(days=7)
_store: dict[str, tuple[int, datetime]] = {}
_lock = threading.Lock()


def _make_key(bot_token: str, chat_id: str, message_id: int) -> str:
    return f"{bot_token}:{chat_id}:{message_id}"


def store(bot_token: str, chat_id: str, message_id: int, task_id: int) -> None:
    key = _make_key(bot_token, chat_id, message_id)
    with _lock:
        _store[key] = (task_id, datetime.now(UTC))


def get(bot_token: str, chat_id: str, message_id: int) -> int | None:
    key = _make_key(bot_token, chat_id, message_id)
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        task_id, created_at = entry
        if datetime.now(UTC) - created_at > _TTL:
            del _store[key]
            return None
        return task_id


def cleanup() -> None:
    with _lock:
        now = datetime.now(UTC)
        expired = [k for k, (_, ts) in _store.items() if now - ts > _TTL]
        for k in expired:
            del _store[k]


def size() -> int:
    with _lock:
        return len(_store)
