import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import auth_router
from app.api.config import config_router
from app.api.router import api_router
from app.api.stats import stats_router
from app.api.tasks import tasks_router
from app.api.users import users_router
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Todowka API",
        description="Todo application with authentication",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins.split(","),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    api_router.include_router(auth_router)
    api_router.include_router(config_router)
    api_router.include_router(stats_router)
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
