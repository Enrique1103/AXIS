"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Flame, Trophy, Star, TrendingUp, X } from "lucide-react"
import {
  getHabits, getMonthSummary, getMonthByHabit,
  getDayRecords, getWeeklyTrend, getWeekdayAvg,
} from "@/lib/api"
import { Habit, MonthSummary, HabitMonthStats, DayRecords } from "@/lib/types"
import { MONTHS, DAYS_SHORT, daysInMonth, firstWeekdayOffset, streak, toISODate } from "@/lib/utils"
import { TrendChart } from "@/components/trend-chart"
import { WeekdayChart } from "@/components/weekday-chart"

interface DayDetail { day: number; records: DayRecords }

export default function StatsPage() {
  const now = new Date()
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [habits, setHabits] = useState<Habit[]>([])
  const [summary, setSummary]         = useState<MonthSummary>({})
  const [prevSummary, setPrevSummary] = useState<MonthSummary>({})
  const [habitStats, setHabitStats]   = useState<HabitMonthStats>({})
  const [trend, setTrend]             = useState<{ label: string; pct: number }[]>([])
  const [weekdayAvg, setWeekdayAvg]   = useState<Record<string, number>>({})
  const [loading, setLoading]         = useState(true)
  const [detail, setDetail]           = useState<DayDetail | null>(null)

  // Trend se carga una sola vez (no depende del mes)
  useEffect(() => {
    getWeeklyTrend().then(setTrend)
  }, [])

  useEffect(() => {
    setLoading(true)
    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    Promise.all([
      getHabits(),
      getMonthSummary(year, month),
      getMonthSummary(prevY, prevM),
      getMonthByHabit(year, month),
      getWeekdayAvg(3),
    ]).then(([h, s, ps, hs, wd]) => {
      setHabits(h); setSummary(s); setPrevSummary(ps)
      setHabitStats(hs); setWeekdayAvg(wd)
      setLoading(false)
    })
  }, [year, month])

  function prevMonth() { month === 1 ? (setMonth(12), setYear(y=>y-1)) : setMonth(m=>m-1) }
  function nextMonth() { month === 12 ? (setMonth(1), setYear(y=>y+1)) : setMonth(m=>m+1) }

  async function openDay(day: number) {
    const ds = toISODate(new Date(year, month-1, day))
    const r = await getDayRecords(ds)
    setDetail({ day, records: r })
  }

  const days        = daysInMonth(year, month)
  const total       = habits.length
  const maxPossible = total * days
  const totalDone   = Object.values(summary).reduce((a,b)=>a+b,0)
  const monthPct    = maxPossible ? Math.round(totalDone / maxPossible * 100) : 0
  const { current, best } = streak(summary, total, year, month)

  const perfectDays = total > 0 ? Object.values(summary).filter(c => c >= total).length : 0

  const prevDays = daysInMonth(month === 1 ? year-1 : year, month === 1 ? 12 : month-1)
  const prevDone = Object.values(prevSummary).reduce((a,b)=>a+b,0)
  const prevPct  = total * prevDays ? Math.round(prevDone / (total * prevDays) * 100) : 0
  const diffPct  = monthPct - prevPct

  const habitPcts  = habits.map(h => ({ name: h.name, pct: days ? Math.round((habitStats[h.id]??0)/days*100) : 0 }))
  const bestHabit  = habitPcts.length ? habitPcts.reduce((a,b) => a.pct>=b.pct ? a : b) : null
  const worstHabit = habitPcts.length ? habitPcts.reduce((a,b) => a.pct<=b.pct ? a : b) : null

  const wdValues  = Array.from({length:7}, (_,i) => weekdayAvg[String(i)]??0)
  const bestWdIdx = wdValues.indexOf(Math.max(...wdValues))
  const DAYS_FULL = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">

      {/* Header */}
      <div className="px-5 pt-4 pb-4 bg-[var(--sticky-bg)] border-b border-slate-700/40
        flex items-center justify-between sticky top-[128px] z-10">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <ChevronLeft size={20}/>
        </button>
        <h2 className="text-lg font-bold tracking-tight">{MONTHS[month-1]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <ChevronRight size={20}/>
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── 1. Tendencia semanal — siempre visible ── */}
        <div className="gc p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Tendencia semanal
            </p>
            <span className="text-xs text-zinc-600">desde el inicio</span>
          </div>
          <TrendChart data={trend}/>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i=>(
              <div key={i} className="h-32 bg-zinc-900 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : (
          <>
            {/* ── 2. Cards de resumen ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniCard icon={<Flame size={18} className="text-orange-400"/>}
                bg="bg-orange-500/10" color="text-orange-400"
                value={current} label="Racha actual"/>
              <MiniCard icon={<Trophy size={18} className="text-yellow-400"/>}
                bg="bg-yellow-500/10" color="text-yellow-400"
                value={best} label="Mejor racha"/>
              <MiniCard icon={<Star size={18} className="text-green-400"/>}
                bg="bg-green-500/10" color="text-green-400"
                value={perfectDays} label="Días perfectos"/>
              <MiniCard
                icon={<TrendingUp size={18} className={diffPct>=0?"text-blue-400":"text-red-400"}/>}
                bg={diffPct>=0?"bg-blue-500/10":"bg-red-500/10"}
                color={diffPct>=0?"text-blue-400":"text-red-400"}
                value={`${diffPct>=0?"+":""}${diffPct}%`}
                label="vs mes anterior"/>
            </div>

            {/* ── 3. Progreso del mes + Hábitos destacados ── */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Progreso */}
              <div className="gc p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Progreso del mes
                  </p>
                  <span className="text-3xl font-bold tabular-nums">
                    {monthPct}<span className="text-sm text-zinc-500 font-normal">%</span>
                  </span>
                </div>
                <div className="h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${monthPct}%`, background:"linear-gradient(90deg,#34d399,#22d3ee)"}}/>
                </div>
                <p className="text-xs text-zinc-600 mt-2">{totalDone} de {maxPossible} completados</p>

                {/* Mejor día */}
                {wdValues.some(v=>v>0) && (
                  <div className="mt-4 pt-4 border-t border-slate-700/40 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest">Mejor día</p>
                      <p className="text-green-400 font-semibold mt-0.5">{DAYS_FULL[bestWdIdx]}</p>
                    </div>
                    <p className="text-xs text-zinc-600">últ. 3 meses</p>
                  </div>
                )}
              </div>

              {/* Mejor / peor hábito */}
              {bestHabit && worstHabit && bestHabit.name !== worstHabit.name ? (
                <div className="gc p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">
                    Hábitos destacados
                  </p>
                  {[
                    { arrow:"↑ Mejor", color:"text-green-400",  barColor:"#22c55e", ...bestHabit },
                    { arrow:"↓ Difícil", color:"text-red-400", barColor:"#ef4444", ...worstHabit },
                  ].map(({arrow, color, barColor, name, pct}) => (
                    <div key={arrow} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${color}`}>{arrow}</span>
                          <span className="text-sm text-zinc-200 truncate max-w-[140px]">{name}</span>
                        </div>
                        <span className="text-xs text-zinc-500 tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{width:`${pct}%`, backgroundColor:barColor}}/>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gc p-4 flex items-center justify-center">
                  <p className="text-xs text-zinc-600">Agrega más hábitos para ver comparativas</p>
                </div>
              )}
            </div>

            {/* ── 4. Por día de semana + Por hábito ── */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="gc p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">
                  Por día de la semana
                </p>
                <WeekdayChart data={weekdayAvg}/>
                <p className="text-xs text-zinc-600 mt-3 text-center">Promedio últimos 3 meses</p>
              </div>

              <div className="gc p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">
                  Por hábito este mes
                </p>
                <div className="space-y-4">
                  {habits.map(h => {
                    const done = habitStats[h.id] ?? 0
                    const pct  = days ? Math.round(done / days * 100) : 0
                    const bc   = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444"
                    return (
                      <div key={h.id}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm text-zinc-200 truncate pr-2">{h.name}</span>
                          <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                            {done}/{days} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{width:`${pct}%`, backgroundColor:bc}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal día */}
      {detail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50 px-4"
          onClick={()=>setDetail(null)}>
          <div className="gc w-full max-w-sm rounded-t-3xl md:rounded-2xl p-5 pb-8"
            onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{detail.day} de {MONTHS[month-1]}</h3>
              <button onClick={()=>setDetail(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                <X size={16}/>
              </button>
            </div>
            <div className="space-y-2.5">
              {habits.map(h => {
                const done = !!detail.records[h.id]
                return (
                  <div key={h.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${done ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                      {done ? "✓" : "·"}
                    </span>
                    <span className={`text-sm ${done ? "text-zinc-100" : "text-zinc-500"}`}>{h.name}</span>
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

// ── Mini stat card ─────────────────────────────────────────────────────────────

function MiniCard({ icon, bg, color, value, label }: {
  icon: React.ReactNode
  bg: string
  color: string
  value: number | string
  label: string
}) {
  return (
    <div className="gc p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
        <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  )
}
