from fastapi import Request
from slowapi import Limiter

from app.config import settings


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_client_ip, enabled=settings.app_env != "test")

write_limit = settings.rate_limit_write
read_limit = settings.rate_limit_read
sse_limit = settings.rate_limit_sse
export_limit = settings.rate_limit_export
