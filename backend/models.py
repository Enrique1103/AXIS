from pydantic import BaseModel
from typing import Optional


class HabitCreate(BaseModel):
    name: str


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None
    ord: Optional[int] = None


class RecordToggle(BaseModel):
    date: str       # ISO format: "2025-05-02"
    habit_id: int
    completed: bool


class RecordSet(BaseModel):
    date: str
    habit_id: int
    completed: Optional[bool] = None  # None = borrar el registro


class TaskCreate(BaseModel):
    title: str
    type: str          # "daily" | "weekly" | "monthly"
    deadline: Optional[str] = None   # ISO date string


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    deadline: Optional[str] = None
