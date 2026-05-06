import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.areas import areas_router
from app.api.auth import auth_router
from app.api.backup_schedules import backup_schedules_router
from app.api.calendar_events import calendar_events_router
from app.api.checklist import checklist_router
from app.api.config import config_router
from app.api.contexts import contexts_router
from app.api.export_import import export_import_router
from app.api.notifications import notifications_router
from app.api.projects import projects_router
from app.api.router import api_router
from app.api.sessions import sessions_router
from app.api.sse import sse_router
from app.api.stats import stats_router
from app.api.tags import tags_router
from app.api.tasks import tasks_router
from app.api.users import users_router
from app.api.verb_templates import verb_templates_router
from app.api.settings import settings_router
from app.api.telegram_auth import router as telegram_router
from app.config import settings
from app.rate_limit import get_client_ip, limiter

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.scheduler import task_scheduler

    await task_scheduler.startup()
    yield
    await task_scheduler.shutdown()


def _rate_limit_exceeded_handler_with_logging(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    client_ip = get_client_ip(request)
    logging.getLogger(__name__).warning(f"Rate limit exceeded for IP {client_ip} on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"},
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title="Todowka API",
        description="Todo application with authentication",
        version="0.1.0",
        lifespan=lifespan,
        default_response_class=JSONResponse,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler_with_logging)

    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response: Response = await call_next(request)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
            content_type = response.headers.get("content-type", "")
            if "text/event-stream" not in content_type:
                response.headers["Content-Security-Policy"] = (
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: blob:; connect-src 'self'; font-src 'self'"
                )
            return response

    app.add_middleware(SecurityHeadersMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins.split(","),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    api_router.include_router(areas_router)
    api_router.include_router(auth_router)
    api_router.include_router(sessions_router)
    api_router.include_router(calendar_events_router)
    api_router.include_router(checklist_router)
    api_router.include_router(config_router)
    api_router.include_router(contexts_router)
    api_router.include_router(export_import_router)
    api_router.include_router(notifications_router)
    api_router.include_router(projects_router)
    api_router.include_router(sse_router)
    api_router.include_router(stats_router)
    api_router.include_router(tags_router)
    api_router.include_router(tasks_router)
    api_router.include_router(users_router)
    api_router.include_router(backup_schedules_router)
    api_router.include_router(verb_templates_router)
    api_router.include_router(settings_router)
    api_router.include_router(telegram_router)
    app.include_router(api_router)

    @app.get("/")
    async def root():
        return {"message": "Todowka API", "version": "0.1.0"}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
