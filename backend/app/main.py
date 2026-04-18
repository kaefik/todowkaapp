import logging
from contextlib import asynccontextmanager
from urllib.parse import parse_qs

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.areas import areas_router
from app.api.auth import auth_router
from app.api.config import config_router
from app.api.contexts import contexts_router
from app.api.notifications import notifications_router
from app.api.projects import projects_router
from app.api.router import api_router
from app.api.sse import sse_router
from app.api.stats import stats_router
from app.api.tags import tags_router
from app.api.tasks import tasks_router
from app.api.users import users_router
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


class SSETokenMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/api/sse"):
                headers: list[tuple[bytes, bytes]] = list(scope.get("headers", []))
                has_auth = any(k.lower() == b"authorization" for k, _ in headers)
                if not has_auth:
                    qs = parse_qs(scope.get("query_string", b"").decode())
                    token = qs.get("token", [None])[0]
                    if token:
                        headers.append((b"authorization", f"Bearer {token}".encode()))
                        scope["headers"] = headers
        await self.app(scope, receive, send)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_client_ip, enabled=settings.app_env != "test")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.scheduler import task_scheduler

    await task_scheduler.startup()
    yield
    await task_scheduler.shutdown()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Todowka API",
        description="Todo application with authentication",
        version="0.1.0",
        lifespan=lifespan,
        default_response_class=JSONResponse,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins.split(","),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    app.add_middleware(SSETokenMiddleware)

    api_router.include_router(areas_router)
    api_router.include_router(auth_router)
    api_router.include_router(config_router)
    api_router.include_router(contexts_router)
    api_router.include_router(notifications_router)
    api_router.include_router(projects_router)
    api_router.include_router(sse_router)
    api_router.include_router(stats_router)
    api_router.include_router(tags_router)
    api_router.include_router(tasks_router)
    api_router.include_router(users_router)
    app.include_router(api_router)

    @app.get("/")
    async def root():
        return {"message": "Todowka API", "version": "0.1.0"}

    @app.get("/health")
    async def health():
        from sqlalchemy import text

        from app.database import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy"}

    return app


app = create_app()
