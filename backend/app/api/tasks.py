from fastapi import APIRouter

tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])


@tasks_router.get("/")
async def tasks_root():
    return {"message": "Tasks endpoints"}
