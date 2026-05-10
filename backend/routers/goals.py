from fastapi import APIRouter, Depends
from database import get_db
from auth import get_user_id
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/goals", tags=["goals"])


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    commitment: Optional[str] = None
    deadline: Optional[str] = None
    image_url: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    commitment: Optional[str] = None
    deadline: Optional[str] = None
    image_url: Optional[str] = None


@router.get("")
def list_goals(user_id: str = Depends(get_user_id)):
    db = get_db()
    goals = db.table("goals").select("*").eq("user_id", user_id).order("created_at").execute().data
    for goal in goals:
        gh = db.table("goal_habits").select("habit_id").eq("goal_id", goal["id"]).execute().data
        goal["habit_ids"] = [r["habit_id"] for r in gh]
    return goals


@router.post("", status_code=201)
def create_goal(body: GoalCreate, user_id: str = Depends(get_user_id)):
    db = get_db()
    res = db.table("goals").insert({
        "user_id": user_id,
        "title": body.title,
        "description": body.description,
        "commitment": body.commitment,
        "deadline": body.deadline,
        "image_url": body.image_url,
    }).execute()
    goal = res.data[0]
    goal["habit_ids"] = []
    return goal


@router.patch("/{goal_id}")
def update_goal(goal_id: int, body: GoalUpdate, user_id: str = Depends(get_user_id)):
    db = get_db()
    data = body.model_dump(exclude_none=True)
    res = db.table("goals").update(data).eq("id", goal_id).eq("user_id", user_id).execute()
    goal = res.data[0]
    gh = db.table("goal_habits").select("habit_id").eq("goal_id", goal_id).execute().data
    goal["habit_ids"] = [r["habit_id"] for r in gh]
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    db.table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()


@router.post("/{goal_id}/habits/{habit_id}", status_code=201)
def attach_habit(goal_id: int, habit_id: str, user_id: str = Depends(get_user_id)):
    db = get_db()
    existing = db.table("goal_habits").select("id").eq("goal_id", goal_id).eq("habit_id", habit_id).execute()
    if not existing.data:
        db.table("goal_habits").insert({"goal_id": goal_id, "habit_id": habit_id}).execute()
    return {"ok": True}


@router.delete("/{goal_id}/habits/{habit_id}", status_code=204)
def detach_habit(goal_id: int, habit_id: str, user_id: str = Depends(get_user_id)):
    db = get_db()
    db.table("goal_habits").delete().eq("goal_id", goal_id).eq("habit_id", habit_id).execute()
