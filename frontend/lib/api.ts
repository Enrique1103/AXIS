import { Habit, DayRecords, MonthSummary, HabitMonthStats, Task, Goal, GoalProgress, Reminder } from "./types"
import { supabase } from "./supabase"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.refreshSession()
  return data.session?.access_token ?? null
}

async function req<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
  const token = await getToken()

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  if (res.status === 401 && retry) {
    await supabase.auth.refreshSession()
    return req<T>(path, options, false)
  }

  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Habits ────────────────────────────────────────────────────────────────────

export const getHabits = (): Promise<Habit[]> =>
  req("/habits")

export const createHabit = (name: string): Promise<Habit> =>
  req("/habits", { method: "POST", body: JSON.stringify({ name }) })

export const updateHabit = (id: string, data: { name?: string; active?: boolean }): Promise<Habit> =>
  req(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteHabit = (id: string): Promise<void> =>
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

export const setRecord = (date: string, habitId: string, state: string | null): Promise<{ state: string | null }> =>
  req("/records/set", {
    method: "POST",
    body: JSON.stringify({ date, habit_id: habitId, state }),
  })

export const resetMonth = (year: number, month: number): Promise<void> =>
  req(`/records/month/${year}/${month}`, { method: "DELETE" })

export const resetAll = (): Promise<void> =>
  req("/records/all", { method: "DELETE" })

// ── Tasks ─────────────────────────────────────────────────────────────────────

// ── Goals ─────────────────────────────────────────────────────────────────────

export const getGoals = (): Promise<Goal[]> =>
  req("/goals")

export const createGoal = (data: Omit<Goal, "id" | "created_at" | "habit_ids">): Promise<Goal> =>
  req("/goals", { method: "POST", body: JSON.stringify(data) })

export const updateGoal = (id: number, data: Partial<Omit<Goal, "id" | "created_at" | "habit_ids">>): Promise<Goal> =>
  req(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteGoal = (id: number): Promise<void> =>
  req(`/goals/${id}`, { method: "DELETE" })

export const attachHabit = (goalId: number, habitId: string): Promise<void> =>
  req(`/goals/${goalId}/habits/${habitId}`, { method: "POST" })

export const detachHabit = (goalId: number, habitId: string): Promise<void> =>
  req(`/goals/${goalId}/habits/${habitId}`, { method: "DELETE" })

export const getGoalProgress = (goalId: number): Promise<GoalProgress> =>
  req(`/goals/${goalId}/progress`)

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getTasks = (type?: string): Promise<Task[]> =>
  req(`/tasks${type ? `?type=${type}` : ""}`)

export const createTask = (data: { title: string; type: string; deadline?: string; parent_task_id?: number }): Promise<Task> =>
  req("/tasks", { method: "POST", body: JSON.stringify(data) })

export const updateTask = (id: number, data: { title?: string; completed?: boolean; deadline?: string | null }): Promise<Task> =>
  req(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteTask = (id: number): Promise<void> =>
  req(`/tasks/${id}`, { method: "DELETE" })

export const addTaskDep = (taskId: number, depId: number): Promise<void> =>
  req(`/tasks/${taskId}/deps/${depId}`, { method: "POST" })

export const removeTaskDep = (taskId: number, depId: number): Promise<void> =>
  req(`/tasks/${taskId}/deps/${depId}`, { method: "DELETE" })

// ── Reminders ─────────────────────────────────────────────────────────────────

export const getReminders = (): Promise<Reminder[]> =>
  req("/reminders")

export const createReminder = (data: Omit<Reminder, "id" | "created_at">): Promise<Reminder> =>
  req("/reminders", { method: "POST", body: JSON.stringify(data) })

export const updateReminder = (id: number, data: Partial<Omit<Reminder, "id" | "created_at">>): Promise<Reminder> =>
  req(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteReminder = (id: number): Promise<void> =>
  req(`/reminders/${id}`, { method: "DELETE" })
