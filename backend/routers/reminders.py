from fastapi import APIRouter, Depends
from database import get_db
from auth import get_user_id
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/reminders", tags=["reminders"])


class ReminderCreate(BaseModel):
    label: str
    time: str          # "HH:MM" (24h)
    days: List[int] = list(range(7))   # 0=Sun … 6=Sat
    active: bool = True


class ReminderUpdate(BaseModel):
    label: Optional[str] = None
    time: Optional[str] = None
    days: Optional[List[int]] = None
    active: Optional[bool] = None


@router.get("")
def list_reminders(user_id: str = Depends(get_user_id)):
    db = get_db()
    return db.table("reminders").select("*").eq("user_id", user_id).order("time").execute().data


@router.post("", status_code=201)
def create_reminder(body: ReminderCreate, user_id: str = Depends(get_user_id)):
    db = get_db()
    res = db.table("reminders").insert({
        "user_id": user_id,
        "label": body.label,
        "time": body.time,
        "days": body.days,
        "active": body.active,
    }).execute()
    return res.data[0]


@router.patch("/{reminder_id}")
def update_reminder(reminder_id: int, body: ReminderUpdate, user_id: str = Depends(get_user_id)):
    db = get_db()
    data = body.model_dump(exclude_unset=True)
    if data:
        db.table("reminders").update(data).eq("id", reminder_id).eq("user_id", user_id).execute()
    return (
        db.table("reminders")
        .select("*")
        .eq("id", reminder_id)
        .eq("user_id", user_id)
        .execute()
        .data[0]
    )


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    db.table("reminders").delete().eq("id", reminder_id).eq("user_id", user_id).execute()
