"use client"

import { AlarmClock, Plus, Lock } from "lucide-react"

const EXAMPLES = [
  { time: "07:00",  label: "Recordatorio matutino",   days: "Lun – Vie" },
  { time: "21:30",  label: "Revisar hábitos del día", days: "Todos los días" },
  { time: "09:00",  label: "Recordatorio de fin de semana", days: "Sáb – Dom" },
]

export default function RemindersPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-zinc-800 sticky top-14 z-10 bg-zinc-950/95 backdrop-blur">
        <h1 className="text-xl font-bold">Recordatorios</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Alarmas y avisos</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Preview de recordatorios */}
        {EXAMPLES.map(({ time, label, days }) => (
          <div key={time} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center gap-4 opacity-40">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <AlarmClock size={18} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200">{label}</p>
              <p className="text-xs text-zinc-500">{days}</p>
            </div>
            <span className="text-lg font-bold tabular-nums text-zinc-400">{time}</span>
            <Lock size={14} className="text-zinc-600 shrink-0" />
          </div>
        ))}

        {/* CTA desactivado */}
        <button disabled
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed
            border-zinc-800 text-zinc-600 cursor-not-allowed text-sm mt-2">
          <Plus size={15} />
          Nuevo recordatorio · Próximamente
        </button>

        <p className="text-xs text-zinc-600 text-center pt-2">
          Pronto podrás configurar recordatorios push para mantener tus hábitos al día.
        </p>
      </div>
    </div>
  )
}
