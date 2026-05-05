from fastapi import APIRouter
from database import get_db
from models import RecordToggle, RecordSet
from datetime import date as date_type, timedelta

router = APIRouter(prefix="/records", tags=["records"])


@router.get("/day/{date}")
def get_day(date: str):
    db = get_db()
    res = db.table("records").select("habit_id, completed").eq("date", date).execute()
    return {r["habit_id"]: r["completed"] for r in res.data}


@router.get("/month/{year}/{month}")
def get_month(year: int, month: int):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    res = (db.table("records")
           .select("date, completed")
           .like("date", f"{prefix}%")
           .eq("completed", True)
           .execute())
    summary: dict[str, int] = {}
    for r in res.data:
        summary[r["date"]] = summary.get(r["date"], 0) + 1
    return summary


@router.get("/month/{year}/{month}/habits")
def get_month_by_habit(year: int, month: int):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    res = (db.table("records")
           .select("habit_id, completed")
           .like("date", f"{prefix}%")
           .eq("completed", True)
           .execute())
    stats: dict[int, int] = {}
    for r in res.data:
        hid = r["habit_id"]
        stats[hid] = stats.get(hid, 0) + 1
    return stats


@router.get("/month-all/{year}/{month}")
def get_month_all(year: int, month: int):
    """Devuelve todos los records del mes como lista plana."""
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    res = (db.table("records")
           .select("date, habit_id, completed")
           .like("date", f"{prefix}%")
           .execute())
    return res.data


@router.post("/set")
def set_record(body: RecordSet):
    """Establece el estado de un record. completed=None borra el registro."""
    db = get_db()
    if body.completed is None:
        db.table("records").delete().eq("date", body.date).eq("habit_id", body.habit_id).execute()
        return {"completed": None}
    db.table("records").upsert({
        "date": body.date,
        "habit_id": body.habit_id,
        "completed": body.completed,
    }).execute()
    return {"completed": body.completed}


@router.post("/toggle")
def toggle(body: RecordToggle):
    db = get_db()
    res = (db.table("records")
           .select("id, completed")
           .eq("date", body.date)
           .eq("habit_id", body.habit_id)
           .execute())
    if res.data:
        new_state = not res.data[0]["completed"]
        db.table("records").update({"completed": new_state}).eq("id", res.data[0]["id"]).execute()
    else:
        new_state = True
        db.table("records").insert({
            "date": body.date,
            "habit_id": body.habit_id,
            "completed": True,
        }).execute()
    return {"completed": new_state}


def _week_label(ws: date_type) -> str:
    """S{n}/{m}/{yy} — usa el jueves para determinar el mes ISO."""
    thursday = ws + timedelta(days=3)
    # primer lunes del mes del jueves
    m = date_type(thursday.year, thursday.month, 1)
    while m.weekday() != 0:
        m += timedelta(days=1)
    week_num = max(1, (ws - m).days // 7 + 1) if ws >= m else 1
    return f"S{week_num}/{thursday.month}/{str(thursday.year)[2:]}"


@router.get("/weekly-trend")
def weekly_trend():
    """% completado por semana desde el primer registro existente."""
    db = get_db()
    habits_res = db.table("habits").select("id").eq("active", True).execute()
    habit_count = len(habits_res.data)
    if habit_count == 0:
        return []

    first_res = (db.table("records").select("date").order("date").limit(1).execute())
    if not first_res.data:
        return []

    first_date = date_type.fromisoformat(first_res.data[0]["date"])
    first_monday = first_date - timedelta(days=first_date.weekday())

    today = date_type.today()
    current_monday = today - timedelta(days=today.weekday())

    res = (db.table("records")
           .select("date, completed")
           .gte("date", str(first_monday))
           .lte("date", str(today))
           .execute())

    completed_by_date: dict[str, int] = {}
    for r in res.data:
        if r["completed"]:
            completed_by_date[r["date"]] = completed_by_date.get(r["date"], 0) + 1

    result = []
    ws = first_monday
    while ws <= current_monday:
        days = [str(ws + timedelta(days=j)) for j in range(7) if (ws + timedelta(days=j)) <= today]
        completed = sum(completed_by_date.get(d, 0) for d in days)
        total = len(days) * habit_count
        pct = round(completed / total * 100, 1) if total else 0
        result.append({"week_start": str(ws), "label": _week_label(ws), "pct": pct})
        ws += timedelta(weeks=1)

    return result


@router.get("/weekday-avg")
def weekday_avg(months: int = 3):
    """% promedio completado por día de la semana (0=Lun … 6=Dom)."""
    db = get_db()
    habits_res = db.table("habits").select("id").eq("active", True).execute()
    habit_count = len(habits_res.data)
    if habit_count == 0:
        return {}

    today = date_type.today()
    range_start = today - timedelta(days=months * 30)

    res = (db.table("records")
           .select("date, completed")
           .gte("date", str(range_start))
           .lte("date", str(today))
           .execute())

    wd_done  = [0] * 7
    wd_total = [0] * 7
    seen_dates: set[str] = set()

    for r in res.data:
        d = r["date"]
        wd = date_type.fromisoformat(d).weekday()
        if r["completed"]:
            wd_done[wd] += 1
        if d not in seen_dates:
            wd_total[wd] += habit_count
            seen_dates.add(d)

    return {
        str(wd): round(wd_done[wd] / wd_total[wd] * 100, 1) if wd_total[wd] else 0
        for wd in range(7)
    }


@router.delete("/month/{year}/{month}", status_code=204)
def reset_month(year: int, month: int):
    db = get_db()
    prefix = f"{year:04d}-{month:02d}-"
    db.table("records").delete().like("date", f"{prefix}%").execute()


@router.delete("/all", status_code=204)
def reset_all():
    db = get_db()
    db.table("records").delete().neq("id", 0).execute()
