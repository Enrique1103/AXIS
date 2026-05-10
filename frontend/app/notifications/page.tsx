"use client"

import { useState, useEffect } from "react"
import { Bell, Flame, Star, Trophy, CheckCircle2, AlertTriangle } from "lucide-react"
import { getHabits, getDayRecords, getWeeklyTrend, getTasks } from "@/lib/api"
import { Habit, DayRecords } from "@/lib/types"

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

interface Achievement {
  id: string
  Icon: React.ElementType
  color: string
  bg: string
  title: string
  sub: string
}

async function detectAchievements(): Promise<Achievement[]> {
  const [habits, trend, tasks] = await Promise.all([
    getHabits(),
    getWeeklyTrend(),
    getTasks(),
  ])

  const today = getToday()
  let records: DayRecords = {}
  try { records = await getDayRecords(today) } catch { /* no records yet today */ }

  const active = habits.filter((h: Habit) => h.active)
  const list: Achievement[] = []

  // ── Día perfecto hoy ──────────────────────────────────────────────────────
  if (active.length > 0) {
    const allDone = active.every((h: Habit) => records[h.id] === "done")
    if (allDone) {
      list.push({
        id: `perfect_day_${today}`,
        Icon: Star,
        color: "text-green-400",
        bg: "bg-green-500/10",
        title: "Día perfecto",
        sub: `Completaste los ${active.length} hábito${active.length > 1 ? "s" : ""} del día.`,
      })
    }
  }

  // ── Racha semanal (semanas con ≥ 80 %) ───────────────────────────────────
  if (trend.length > 0) {
    const best = trend.reduce((a, b) => (a.pct >= b.pct ? a : b))
    if (best.pct >= 80) {
      list.push({
        id: `best_week_${best.week_start}`,
        Icon: Flame,
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        title: `Semana de ${best.pct}%`,
        sub: `Tu mejor semana reciente fue del ${best.week_start}.`,
      })
    }

    const lastFull = trend.filter(w => w.pct === 100)
    if (lastFull.length >= 2) {
      list.push({
        id: `two_perfect_weeks`,
        Icon: Trophy,
        color: "text-yellow-400",
        bg: "bg-yellow-500/10",
        title: "Dos semanas perfectas",
        sub: `Lograste 100% de cumplimiento en ${lastFull.length} semanas recientes.`,
      })
    }
  }

  // ── Tareas al día ─────────────────────────────────────────────────────────
  const today2 = getToday()
  const overdue = tasks.filter(t => !t.completed && !!t.deadline && t.deadline < today2)
  const completed = tasks.filter(t => t.completed)

  if (overdue.length === 0 && tasks.length > 0) {
    list.push({
      id: `tasks_uptodate_${today}`,
      Icon: CheckCircle2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      title: "Tareas al día",
      sub: `Sin tareas vencidas. ${completed.length} completada${completed.length !== 1 ? "s" : ""} en total.`,
    })
  } else if (overdue.length > 0) {
    list.push({
      id: `tasks_overdue_${today}`,
      Icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      title: `${overdue.length} tarea${overdue.length > 1 ? "s" : ""} vencida${overdue.length > 1 ? "s" : ""}`,
      sub: overdue.slice(0, 2).map(t => t.title).join(" · ") + (overdue.length > 2 ? ` y ${overdue.length - 2} más` : ""),
    })
  }

  return list
}

export default function NotificationsPage() {
  const [items,   setItems]   = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    detectAchievements()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 bg-[var(--sticky-bg)] border-b border-slate-700/40 sticky top-[128px] z-10">
        <h1 className="text-lg font-bold">Notificaciones</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Logros y actividad reciente</p>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse"/>)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-10 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-1">
              <Bell size={22} className="text-zinc-600"/>
            </div>
            <p className="text-sm font-medium text-zinc-400">Sin logros por ahora</p>
            <p className="text-xs text-zinc-600 max-w-[260px]">
              Completa tus hábitos hoy para ver tu progreso reflejado aquí.
            </p>
          </div>
        ) : (
          items.map(({ id, Icon, color, bg, title, sub }) => (
            <div key={id} className="gc p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={color}/>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">{title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
