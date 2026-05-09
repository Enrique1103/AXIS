import { Habit, DayRecords, MonthSummary, HabitMonthStats, Task } from "./types"
import { supabase } from "./supabase"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Habits ────────────────────────────────────────────────────────────────────

export const getHabits = (): Promise<Habit[]> =>
  req("/habits")

export const createHabit = (name: string): Promise<Habit> =>
  req("/habits", { method: "POST", body: JSON.stringify({ name }) })

export const updateHabit = (id: number, data: { name?: string; active?: boolean }): Promise<Habit> =>
  req(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteHabit = (id: number): Promise<void> =>
  req(`/habits/${id}`, { method: "DELETE" })

// ── Records ───────────────────────────────────────────────────────────────────

export const getDayRecords = (date: string): Promise<DayRecords> =>
  req(`/records/day/${date}`)

export const getMonthSummary = (year: number, month: number): Promise<MonthSummary> =>
  req(`/records/month/${year}/${month}`)

export const getMonthByHabit = (year: number, month: number): Promise<HabitMonthStats> =>
  req(`/records/month/${year}/${month}/habits`)

export const getWeeklyTrend = (): Promise<{ week_start: string; label: string; pct: number }[]> =>
  req(`/records/weekly-trend`)

export const getWeekdayAvg = (months = 3): Promise<Record<string, number>> =>
  req(`/records/weekday-avg?months=${months}`)

export const getMonthAll = (year: number, month: number): Promise<{ date: string; habit_id: number; state: string }[]> =>
  req(`/records/month-all/${year}/${month}`)

export const setRecord = (date: string, habitId: number, state: string | null): Promise<{ state: string | null }> =>
  req("/records/set", {
    method: "POST",
    body: JSON.stringify({ date, habit_id: habitId, state }),
  })

export const resetMonth = (year: number, month: number): Promise<void> =>
  req(`/records/month/${year}/${month}`, { method: "DELETE" })

export const resetAll = (): Promise<void> =>
  req("/records/all", { method: "DELETE" })

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getTasks = (type?: string): Promise<Task[]> =>
  req(`/tasks${type ? `?type=${type}` : ""}`)

export const createTask = (data: { title: string; type: string; deadline?: string }): Promise<Task> =>
  req("/tasks", { method: "POST", body: JSON.stringify(data) })

export const updateTask = (id: number, data: { title?: string; completed?: boolean; deadline?: string | null }): Promise<Task> =>
  req(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteTask = (id: number): Promise<void> =>
  req(`/tasks/${id}`, { method: "DELETE" })
