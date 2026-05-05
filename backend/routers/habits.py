from fastapi import APIRouter
from database import get_db
from models import HabitCreate, HabitUpdate

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("")
def list_habits():
    db = get_db()
    res = db.table("habits").select("*").eq("active", True).order("ord").execute()
    return res.data


@router.post("", status_code=201)
def create_habit(body: HabitCreate):
    db = get_db()
    # Get next order value
    existing = db.table("habits").select("ord").order("ord", desc=True).limit(1).execute()
    next_ord = (existing.data[0]["ord"] + 1) if existing.data else 0
    res = db.table("habits").insert({
        "name": body.name.strip(),
        "ord": next_ord,
        "active": True,
    }).execute()
    return res.data[0]


@router.patch("/{habit_id}")
def update_habit(habit_id: int, body: HabitUpdate):
    db = get_db()
    data = body.model_dump(exclude_none=True)
    res = db.table("habits").update(data).eq("id", habit_id).execute()
    return res.data[0]


@router.delete("/{habit_id}", status_code=204)
def delete_habit(habit_id: int):
    db = get_db()
    db.table("habits").update({"active": False}).eq("id", habit_id).execute()


@router.put("/reorder")
def reorder_habits(ordered_ids: list[int]):
    db = get_db()
    for i, hid in enumerate(ordered_ids):
        db.table("habits").update({"ord": i}).eq("id", hid).execute()
    return {"ok": True}
