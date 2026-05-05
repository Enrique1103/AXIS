"use client"

import { Target, Plus, Lock } from "lucide-react"

const EXAMPLES = [
  { label: "Completar hábito X al 80% del mes",   locked: true  },
  { label: "Mantener racha de 30 días",            locked: true  },
  { label: "No fallar más de 2 días seguidos",     locked: true  },
]

export default function GoalsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-zinc-800 sticky top-14 z-10 bg-zinc-950/95 backdrop-blur">
        <h1 className="text-xl font-bold">Metas</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Objetivos por hábito</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Preview de metas futuras */}
        {EXAMPLES.map(({ label, locked }) => (
          <div key={label} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center gap-3 opacity-40">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Target size={18} className="text-violet-400" />
            </div>
            <p className="text-sm text-zinc-300 flex-1">{label}</p>
            {locked && <Lock size={14} className="text-zinc-600 shrink-0" />}
          </div>
        ))}

        {/* CTA desactivado */}
        <button disabled
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed
            border-zinc-800 text-zinc-600 cursor-not-allowed text-sm mt-2">
          <Plus size={15} />
          Nueva meta · Próximamente
        </button>

        <p className="text-xs text-zinc-600 text-center pt-2">
          Esta sección está en desarrollo. Pronto podrás definir metas medibles por hábito.
        </p>
      </div>
    </div>
  )
}
