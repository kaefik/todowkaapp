from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import auth_router
from app.api.router import api_router
from app.api.tasks import tasks_router
from app.config import settings


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
    api_router.include_router(tasks_router)
    app.include_router(api_router)

    @app.get("/")
    async def root():
        return {"message": "Todowka API", "version": "0.1.0"}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
