from fastapi import APIRouter, Depends
from typing import Optional
from database import get_db
from models import TaskCreate, TaskUpdate
from auth import get_user_id

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/")
def get_tasks(type: Optional[str] = None, user_id: str = Depends(get_user_id)):
    db = get_db()
    q = db.table("tasks").select("*").eq("user_id", user_id).order("created_at", desc=True)
    if type:
        q = q.eq("type", type)
    return q.execute().data


@router.post("/")
def create_task(body: TaskCreate, user_id: str = Depends(get_user_id)):
    db = get_db()
    res = db.table("tasks").insert({
        "title": body.title,
        "type": body.type,
        "deadline": body.deadline,
        "completed": False,
        "user_id": user_id,
    }).execute()
    return res.data[0]


@router.patch("/{task_id}")
def update_task(task_id: int, body: TaskUpdate, user_id: str = Depends(get_user_id)):
    db = get_db()
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    res = db.table("tasks").update(data).eq("id", task_id).eq("user_id", user_id).execute()
    return res.data[0]


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    db.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
