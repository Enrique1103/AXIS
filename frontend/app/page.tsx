"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Flame, TrendingUp, TrendingDown } from "lucide-react"
import { getHabits, getMonthAll, setRecord, getMonthSummary } from "@/lib/api"
import { Habit } from "@/lib/types"
import { MONTHS, DAYS_SHORT, daysInMonth, firstWeekdayOffset, toISODate, streak } from "@/lib/utils"
import { HabitCell } from "@/components/habit-cell"
import { MonthlyEKGChart } from "@/components/monthly-ekg-chart"

type RecordMatrix = Record<string, Record<number, boolean>>

function getWeeks(year: number, month: number): (number | null)[][] {
  const days = daysInMonth(year, month)
  const offset = firstWeekdayOffset(year, month)
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// ── Weekly view ──────────────────────────────────────────────────────────────

function WeeklyView({
  weeks, habits, matrix, year, month, todayStr, onComplete, onNotComplete,
}: {
  weeks: (number | null)[][]
  habits: Habit[]
  matrix: RecordMatrix
  year: number
  month: number
  todayStr: string
  onComplete: (date: string, habitId: number) => void
  onNotComplete: (date: string, habitId: number) => void
}) {
  const currentWeekIdx = weeks.findIndex(week =>
    week.some(d => d && dateStr(year, month, d) === todayStr)
  )

  return (
    <div className="px-3 py-4 space-y-3 pb-24">
      {weeks.map((week, wi) => {
        const isCurrentWeek = wi === currentWeekIdx
        const firstDay = week.find(d => d !== null)
        const lastDay = [...week].reverse().find(d => d !== null)

        return (
          <div
            key={wi}
            className={`rounded-2xl overflow-hidden border ${
              isCurrentWeek ? "border-green-500/40 bg-green-500/5" : "border-slate-700/40 bg-slate-900/60"
            }`}
          >
            {/* Week header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
              <span className={`text-xs font-bold tracking-wider ${isCurrentWeek ? "text-green-400" : "text-zinc-400"}`}>
                SEMANA {wi + 1}
              </span>
              <span className="text-xs text-zinc-500">
                {firstDay}–{lastDay} {MONTHS[month - 1]}
              </span>
            </div>

            {/* Header: day letters + numbers */}
            <div className="grid items-center px-2 pt-2 pb-1"
              style={{ gridTemplateColumns: "minmax(90px, 1fr) repeat(7, minmax(0, 1fr))" }}>
              <div />
              {DAYS_SHORT.map((d, i) => {
                const day = week[i]
                const ds = day ? dateStr(year, month, day) : null
                const isToday = ds === todayStr
                return (
                  <div key={i} className="flex flex-col items-center">
                    <span className={`text-[10px] ${isToday ? "text-blue-400" : "text-zinc-500"}`}>{d}</span>
                    <span className={`text-xs font-semibold ${isToday ? "text-blue-400" : day ? "text-zinc-300" : "text-zinc-700"}`}>
                      {day ?? "·"}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Habit rows */}
            <div className="px-2 pb-2 space-y-1">
              {habits.map(habit => (
                <div
                  key={habit.id}
                  className="grid items-center gap-0"
                  style={{ gridTemplateColumns: "minmax(90px, 1fr) repeat(7, minmax(0, 1fr))" }}
                >
                  <span className="text-xs text-zinc-300 truncate pr-1 py-1">{habit.name}</span>
                  {week.map((day, i) => {
                    if (!day) return <div key={i} className="flex justify-center"><div className="w-9 h-9" /></div>
                    const ds = dateStr(year, month, day)
                    const isToday = ds === todayStr
                    const isPast = ds <= todayStr
                    return (
                      <div key={i} className="flex justify-center py-0.5">
                        <HabitCell
                          state={matrix[ds]?.[habit.id]}
                          isToday={isToday}
                          isPast={isPast}
                          onComplete={() => onComplete(ds, habit.id)}
                          onNotComplete={() => onNotComplete(ds, habit.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Monthly view ─────────────────────────────────────────────────────────────

function MonthlyView({
  habits, matrix, year, month, todayStr, onComplete, onNotComplete,
}: {
  habits: Habit[]
  matrix: RecordMatrix
  year: number
  month: number
  todayStr: string
  onComplete: (date: string, habitId: number) => void
  onNotComplete: (date: string, habitId: number) => void
}) {
  const days = daysInMonth(year, month)
  const allDays = Array.from({ length: days }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto pb-24">
      <table className="border-collapse" style={{ minWidth: `${160 + days * 36}px` }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-950 border-b border-zinc-800 px-3 py-2 text-left text-xs text-zinc-500 font-normal min-w-[160px]">
              Hábito
            </th>
            {allDays.map(day => {
              const ds = dateStr(year, month, day)
              const isToday = ds === todayStr
              const dow = new Date(year, month - 1, day).getDay()
              const letter = ["D", "L", "M", "X", "J", "V", "S"][dow]
              const isMon = dow === 1 && day > 1
              return (
                <th
                  key={day}
                  className={`border-b border-zinc-800 w-9 py-1 text-center
                    ${isToday ? "bg-blue-500/10" : ""}
                    ${isMon ? "border-l border-l-zinc-700" : ""}`}
                >
                  <div className={`text-[10px] ${isToday ? "text-blue-400" : "text-zinc-600"}`}>{letter}</div>
                  <div className={`text-xs font-semibold ${isToday ? "text-blue-400" : "text-zinc-300"}`}>{day}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit, idx) => (
            <tr key={habit.id} className={idx % 2 === 0 ? "" : "bg-zinc-900/20"}>
              <td className="sticky left-0 z-10 bg-[var(--sticky-bg)] border-b border-slate-700/25 px-3 py-1">
                <span className="text-sm text-zinc-200 whitespace-nowrap">{habit.name}</span>
              </td>
              {allDays.map(day => {
                const ds = dateStr(year, month, day)
                const isToday = ds === todayStr
                const isPast = ds <= todayStr
                const dow = new Date(year, month - 1, day).getDay()
                const isMon = dow === 1 && day > 1
                return (
                  <td
                    key={day}
                    className={`border-b border-slate-700/25 py-1
                      ${isToday ? "bg-blue-500/5" : ""}
                      ${isMon ? "border-l border-l-zinc-700" : ""}`}
                  >
                    <div className="flex justify-center">
                      <HabitCell
                        state={matrix[ds]?.[habit.id]}
                        isToday={isToday}
                        isPast={isPast}
                        onComplete={() => onComplete(ds, habit.id)}
                        onNotComplete={() => onNotComplete(ds, habit.id)}
                        size="sm"
                      />
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HabitTrackerPage() {
  const now = new Date()
  const today = toISODate(now)

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [habits, setHabits] = useState<Habit[]>([])
  const [matrix, setMatrix] = useState<RecordMatrix>({})
  const [loading, setLoading] = useState(true)
  const [prevMonthDone, setPrevMonthDone] = useState(0)
  const [prevMonthDays, setPrevMonthDays] = useState(0)
  const [view, setView] = useState<"weekly" | "monthly">("weekly")

  // Auto-detecta vista según ancho. Se actualiza al redimensionar.
  useEffect(() => {
    function detect() {
      setView(window.innerWidth >= 768 ? "monthly" : "weekly")
    }
    detect()
    window.addEventListener("resize", detect)
    return () => window.removeEventListener("resize", detect)
  }, [])

  // Load data
  const load = useCallback(async () => {
    setLoading(true)
    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    const [h, records, prevSummary] = await Promise.all([
      getHabits(),
      getMonthAll(year, month),
      getMonthSummary(prevY, prevM),
    ])
    setHabits(h)
    const m: RecordMatrix = {}
    for (const r of records) {
      if (!m[r.date]) m[r.date] = {}
      m[r.date][r.habit_id] = r.completed
    }
    setMatrix(m)
    setPrevMonthDone(Object.values(prevSummary).reduce((a, b) => a + b, 0))
    setPrevMonthDays(daysInMonth(prevY, prevM))
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  // Cell handlers with optimistic update
  // Click/tap: verde. Si ya era verde → vacío. Si era rojo → verde.
  async function handleComplete(ds: string, habitId: number) {
    const current = matrix[ds]?.[habitId]
    const next = current === true ? null : true
    setMatrix(prev => {
      const updated = { ...prev, [ds]: { ...(prev[ds] ?? {}) } }
      if (next === null) delete updated[ds][habitId]
      else updated[ds][habitId] = next
      return updated
    })
    try { await setRecord(ds, habitId, next) } catch { load() }
  }

  // Doble click / press largo: rojo. Si ya era rojo → vacío. Si era verde → rojo.
  async function handleNotComplete(ds: string, habitId: number) {
    const current = matrix[ds]?.[habitId]
    const next = current === false ? null : false
    setMatrix(prev => {
      const updated = { ...prev, [ds]: { ...(prev[ds] ?? {}) } }
      if (next === null) delete updated[ds][habitId]
      else updated[ds][habitId] = next
      return updated
    })
    try { await setRecord(ds, habitId, next) } catch { load() }
  }

  // Today's progress

  const weeks = getWeeks(year, month)

  // ── Insights ──
  const monthlySummary: Record<string, number> = {}
  for (const [date, dayRec] of Object.entries(matrix)) {
    monthlySummary[date] = Object.values(dayRec).filter(v => v === true).length
  }
  const { current: currentStreak } = streak(monthlySummary, habits.length, year, month)
  const days = daysInMonth(year, month)
  const habitPcts = habits.map(h => {
    const done = Object.values(matrix).filter(dayRec => dayRec[h.id] === true).length
    return { id: h.id, name: h.name, pct: days > 0 ? Math.round(done / days * 100) : 0 }
  })
  const bestHabit = habitPcts.length > 0 ? habitPcts.reduce((a, b) => a.pct >= b.pct ? a : b) : null
  const totalDoneMonth = Object.values(monthlySummary).reduce((a, b) => a + b, 0)
  const currentPct = habits.length * days > 0 ? Math.round(totalDoneMonth / (habits.length * days) * 100) : 0
  const prevPct = habits.length * prevMonthDays > 0 ? Math.round(prevMonthDone / (habits.length * prevMonthDays) * 100) : 0
  const diffPct = currentPct - prevPct

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sticky header */}
      <div className="sticky top-[128px] z-20 bg-[var(--sticky-bg)] border-b border-slate-700/40 px-4 pt-2 pb-2">

        {/* 3 cards */}
        <div className="grid grid-cols-3 gap-2 mb-2">

          {/* Mes */}
          <div className="rounded-lg px-1.5 py-1.5 flex flex-col items-center gap-0.5 bg-zinc-800/50 border border-slate-700/30">
            <div className="flex items-center justify-between w-full">
              <button onClick={prevMonth} className="p-0.5 rounded hover:bg-zinc-700 transition-colors text-zinc-400">
                <ChevronLeft size={10}/>
              </button>
              <span className="text-[10px] font-bold text-zinc-200 leading-none">
                {MONTHS[month - 1].slice(0, 3)} {String(year).slice(2)}
              </span>
              <button onClick={nextMonth} className="p-0.5 rounded hover:bg-zinc-700 transition-colors text-zinc-400">
                <ChevronRight size={10}/>
              </button>
            </div>
            <p className="text-[8px] text-zinc-600 leading-none">Período</p>
          </div>

          {/* Índice de Resiliencia */}
          <div className={`rounded-lg px-2 py-1.5 flex flex-col gap-0.5
            ${currentStreak > 0 ? "bg-amber-500/10 border border-amber-500/25" : "bg-zinc-800/50 border border-slate-700/30"}`}>
            <div className="flex items-center gap-1">
              <Flame size={11} className={currentStreak > 0 ? "text-amber-400" : "text-zinc-500"}/>
              <span className={`text-sm font-bold tabular-nums leading-none ${currentStreak > 0 ? "text-amber-400" : "text-zinc-500"}`}>
                {currentStreak}
              </span>
            </div>
            <p className="text-[8px] text-zinc-500 leading-none">Índice Resiliencia</p>
          </div>

          {/* vs mes anterior */}
          <div className={`rounded-lg px-2 py-1.5 flex flex-col gap-0.5
            ${diffPct >= 0 ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            <div className="flex items-center gap-1">
              {diffPct >= 0
                ? <TrendingUp size={11} className="text-green-400"/>
                : <TrendingDown size={11} className="text-red-400"/>}
              <span className={`text-sm font-bold tabular-nums leading-none ${diffPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {diffPct >= 0 ? "+" : ""}{diffPct}%
              </span>
            </div>
            <p className="text-[8px] text-zinc-500 leading-none">vs mes anterior</p>
          </div>
        </div>

      </div>

      {/* Tendencia del mes */}
      {!loading && habits.length > 0 && (
        <div className="mx-4 mt-3 gc p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              Tendencia del mes
            </p>
            <span className="text-[10px] text-zinc-600">{MONTHS[month - 1]} {year}</span>
          </div>
          <MonthlyEKGChart
            matrix={matrix}
            habitCount={habits.length}
            year={year}
            month={month}
            todayStr={today}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="p-4 pt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-zinc-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center text-zinc-500 mt-20 px-6">
          <p className="text-lg">Sin hábitos configurados</p>
          <p className="text-sm mt-1">Ve a Ajustes para agregar tus hábitos</p>
        </div>
      ) : view === "weekly" ? (
        <div className="mt-6">
        <WeeklyView
          weeks={weeks}
          habits={habits}
          matrix={matrix}
          year={year}
          month={month}
          todayStr={today}
          onComplete={handleComplete}
          onNotComplete={handleNotComplete}
        />
        </div>
      ) : (
        <div className="mt-6">
        <MonthlyView
          habits={habits}
          matrix={matrix}
          year={year}
          month={month}
          todayStr={today}
          onComplete={handleComplete}
          onNotComplete={handleNotComplete}
        />
        </div>
      )}

      {/* ── Bottom insights ── */}
      {!loading && habits.length > 0 && (
        <div className="px-4 pt-2 pb-10 space-y-3">


          {/* Mini bars por hábito */}
          <div className="gc p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
              Progreso del mes · {MONTHS[month - 1]}
            </p>
            <div className="space-y-3">
              {habitPcts.map(({ id, name, pct }) => {
                const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444"
                return (
                  <div key={id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-zinc-300 truncate pr-2">{name}</span>
                      <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
