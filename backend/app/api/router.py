from fastapi import APIRouter

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def api_root():
    return {"message": "Todowka API", "version": "0.1.0", "endpoints": ["/api/auth", "/api/tasks", "/api/stats"]}
