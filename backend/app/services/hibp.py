import hashlib
import logging
import time

import httpx

logger = logging.getLogger(__name__)

_range_cache: dict[str, tuple[float, str]] = {}
_CACHE_TTL = 3600


def _sha1_hex(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest().upper()


def _find_in_range(suffix: str, range_text: str) -> int:
    for line in range_text.splitlines():
        parts = line.strip().split(":")
        if len(parts) == 2 and parts[0] == suffix:
            return int(parts[1])
    return 0


async def check_password_breach(password: str) -> int:
    sha1 = _sha1_hex(password)
    prefix = sha1[:5]
    suffix = sha1[5:]

    now = time.time()

    if prefix in _range_cache:
        cached_time, range_text = _range_cache[prefix]
        if now - cached_time < _CACHE_TTL:
            return _find_in_range(suffix, range_text)

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}"
            )
            response.raise_for_status()
            range_text = response.text
    except Exception:
        logger.warning("HIBP API unavailable, skipping breach check", exc_info=True)
        return 0

    _range_cache[prefix] = (now, range_text)
    return _find_in_range(suffix, range_text)
