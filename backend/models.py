from pydantic import BaseModel
from typing import Optional


class HabitCreate(BaseModel):
    name: str


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None
    ord: Optional[int] = None


class RecordSet(BaseModel):
    date: str
    habit_id: int
    state: Optional[str] = None  # 'done' | 'rest' | 'failed' | None = borrar


class TaskCreate(BaseModel):
    title: str
    type: str          # "daily" | "weekly" | "monthly"
    deadline: Optional[str] = None   # ISO date string


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    deadline: Optional[str] = None
