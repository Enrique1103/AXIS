from fastapi import APIRouter, Depends
from database import get_db
from models import RecordSet
from auth import get_user_id
from datetime import date as date_type, timedelta

router = APIRouter(prefix="/records", tags=["records"])


@router.get("/day/{date}")
def get_day(date: str, user_id: str = Depends(get_user_id)):
    db = get_db()
    res = db.table("records").select("habit_id, state").eq("date", date).eq("user_id", user_id).execute()
    return {r["habit_id"]: r["state"] for r in res.data}


@router.get("/month/{year}/{month}")
def get_month(year: int, month: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    res = (db.table("records")
           .select("date")
           .like("date", f"{prefix}%")
           .eq("state", "done")
           .eq("user_id", user_id)
           .execute())
    summary: dict[str, int] = {}
    for r in res.data:
        summary[r["date"]] = summary.get(r["date"], 0) + 1
    return summary


@router.get("/month/{year}/{month}/habits")
def get_month_by_habit(year: int, month: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    res = (db.table("records")
           .select("habit_id")
           .like("date", f"{prefix}%")
           .eq("state", "done")
           .eq("user_id", user_id)
           .execute())
    stats: dict[int, int] = {}
    for r in res.data:
        hid = r["habit_id"]
        stats[hid] = stats.get(hid, 0) + 1
    return stats


@router.get("/month-all/{year}/{month}")
def get_month_all(year: int, month: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    res = (db.table("records")
           .select("date, habit_id, state")
           .like("date", f"{prefix}%")
           .eq("user_id", user_id)
           .execute())
    return res.data


@router.post("/set")
def set_record(body: RecordSet, user_id: str = Depends(get_user_id)):
    db = get_db()
    if body.state is None:
        db.table("records").delete().eq("date", body.date).eq("habit_id", body.habit_id).eq("user_id", user_id).execute()
        return {"state": None}
    existing = db.table("records").select("id").eq("date", body.date).eq("habit_id", body.habit_id).eq("user_id", user_id).execute()
    if existing.data:
        db.table("records").update({"state": body.state}).eq("id", existing.data[0]["id"]).execute()
    else:
        db.table("records").insert({
            "date": body.date,
            "habit_id": body.habit_id,
            "state": body.state,
            "user_id": user_id,
        }).execute()
    return {"state": body.state}


def _week_label(ws: date_type) -> str:
    thursday = ws + timedelta(days=3)
    m = date_type(thursday.year, thursday.month, 1)
    while m.weekday() != 0:
        m += timedelta(days=1)
    week_num = max(1, (ws - m).days // 7 + 1) if ws >= m else 1
    return f"S{week_num}/{thursday.month}/{str(thursday.year)[2:]}"


@router.get("/weekly-trend")
def weekly_trend(user_id: str = Depends(get_user_id)):
    db = get_db()
    habits_res = db.table("habits").select("id").eq("user_id", user_id).eq("active", True).execute()
    habit_count = len(habits_res.data)
    if habit_count == 0:
        return []

    first_res = (db.table("records").select("date").eq("user_id", user_id).order("date").limit(1).execute())
    if not first_res.data:
        return []

    first_date = date_type.fromisoformat(first_res.data[0]["date"])
    first_monday = first_date - timedelta(days=first_date.weekday())
    today = date_type.today()
    current_monday = today - timedelta(days=today.weekday())

    res = (db.table("records")
           .select("date, state")
           .eq("user_id", user_id)
           .gte("date", str(first_monday))
           .lte("date", str(today))
           .execute())

    done_by_date: dict[str, int] = {}
    rest_by_date: dict[str, int] = {}
    for r in res.data:
        if r["state"] == "done":
            done_by_date[r["date"]] = done_by_date.get(r["date"], 0) + 1
        elif r["state"] == "rest":
            rest_by_date[r["date"]] = rest_by_date.get(r["date"], 0) + 1

    result = []
    ws = first_monday
    while ws <= current_monday:
        days = [str(ws + timedelta(days=j)) for j in range(7) if (ws + timedelta(days=j)) <= today]
        done = sum(done_by_date.get(d, 0) for d in days)
        rest = sum(rest_by_date.get(d, 0) for d in days)
        total = len(days) * habit_count - rest
        pct = round(done / total * 100, 1) if total else 0
        result.append({"week_start": str(ws), "label": _week_label(ws), "pct": pct})
        ws += timedelta(weeks=1)

    return result


@router.get("/weekday-avg")
def weekday_avg(months: int = 3, user_id: str = Depends(get_user_id)):
    db = get_db()
    habits_res = db.table("habits").select("id").eq("user_id", user_id).eq("active", True).execute()
    habit_count = len(habits_res.data)
    if habit_count == 0:
        return {}

    today = date_type.today()
    range_start = today - timedelta(days=months * 30)

    res = (db.table("records")
           .select("date, state")
           .eq("user_id", user_id)
           .gte("date", str(range_start))
           .lte("date", str(today))
           .execute())

    wd_done  = [0] * 7
    wd_rest  = [0] * 7
    wd_total = [0] * 7
    seen_dates: set[str] = set()

    for r in res.data:
        d = r["date"]
        wd = date_type.fromisoformat(d).weekday()
        if r["state"] == "done":
            wd_done[wd] += 1
        elif r["state"] == "rest":
            wd_rest[wd] += 1
        if d not in seen_dates:
            wd_total[wd] += habit_count
            seen_dates.add(d)

    return {
        str(wd): round(wd_done[wd] / (wd_total[wd] - wd_rest[wd]) * 100, 1)
        if (wd_total[wd] - wd_rest[wd]) > 0 else 0
        for wd in range(7)
    }


@router.delete("/month/{year}/{month}", status_code=204)
def reset_month(year: int, month: int, user_id: str = Depends(get_user_id)):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    db.table("records").delete().like("date", f"{prefix}%").eq("user_id", user_id).execute()


@router.delete("/all", status_code=204)
def reset_all(user_id: str = Depends(get_user_id)):
    db = get_db()
    db.table("records").delete().eq("user_id", user_id).execute()
