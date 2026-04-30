from fastapi import APIRouter

from app.api import review as review_api

api_router = APIRouter(prefix="/api")

api_router.include_router(review_api.review_router)


@api_router.get("/")
async def api_root():
    return {
        "message": "Todowka API",
        "version": "0.1.0",
        "endpoints": ["/api/auth", "/api/tasks", "/api/stats", "/api/config", "/api/users"],
    }
