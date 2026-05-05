"use client"

import { Bell, Flame, Star, Trophy } from "lucide-react"

const MOCK = [
  { icon: Flame,  color: "text-orange-400", bg: "bg-orange-500/10", title: "Racha de 7 días",       sub: "¡Completaste hábitos 7 días seguidos!"  },
  { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10", title: "Mejor mes hasta ahora", sub: "Superaste tu récord del mes anterior."   },
  { icon: Star,   color: "text-green-400",  bg: "bg-green-500/10",  title: "Día perfecto",          sub: "Completaste todos los hábitos del día."  },
]

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-zinc-800 sticky top-14 z-10 bg-zinc-950/95 backdrop-blur">
        <h1 className="text-xl font-bold">Notificaciones</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Logros y actividad reciente</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Preview cards (estáticas por ahora) */}
        {MOCK.map(({ icon: Icon, color, bg, title, sub }) => (
          <div key={title} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-start gap-3 opacity-50">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}

        {/* Empty state */}
        <div className="flex flex-col items-center text-center pt-6 pb-4 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-1">
            <Bell size={22} className="text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Sin notificaciones activas</p>
          <p className="text-xs text-zinc-600 max-w-[260px]">
            Cuando alcances logros o rachas aparecerán aquí automáticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
