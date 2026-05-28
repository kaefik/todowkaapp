from fastapi import Request
from slowapi import Limiter

from app.config import settings


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ips = [ip.strip() for ip in forwarded.split(",")]
        trusted = settings.trusted_proxies.split(",") if settings.trusted_proxies else []
        if trusted:
            for ip in reversed(ips):
                if ip not in trusted:
                    return ip
        return ips[-1].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_client_ip, enabled=settings.app_env != "test")

write_limit = settings.rate_limit_write
read_limit = settings.rate_limit_read
sse_limit = settings.rate_limit_sse
export_limit = settings.rate_limit_export
