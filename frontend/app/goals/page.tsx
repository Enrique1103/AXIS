"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, Check, CalendarDays, Flame, Target } from "lucide-react"
import { getGoals, createGoal, updateGoal, deleteGoal, attachHabit, detachHabit, getHabits } from "@/lib/api"
import { Goal, Habit } from "@/lib/types"

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function daysLeft(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}d vencida`, color: "text-red-400" }
  if (diff === 0) return { label: "Hoy", color: "text-amber-400" }
  return { label: `${diff}d restantes`, color: "text-zinc-400" }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function GoalModal({
  initial, habits, onSave, onClose,
}: {
  initial?: Goal
  habits: Habit[]
  onSave: (data: Partial<Goal>, habitIds: string[]) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle]           = useState(initial?.title ?? "")
  const [description, setDesc]      = useState(initial?.description ?? "")
  const [commitment, setCommitment] = useState(initial?.commitment ?? "")
  const [deadline, setDeadline]     = useState(initial?.deadline ?? "")
  const [selectedHabits, setSelected] = useState<string[]>(initial?.habit_ids ?? [])
  const [saving, setSaving]         = useState(false)

  function toggleHabit(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id])
  }

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        commitment: commitment.trim() || null,
        deadline: deadline || null,
        image_url: initial?.image_url ?? null,
      }, selectedHabits)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
          <h2 className="font-semibold text-zinc-100">{initial ? "Editar meta" : "Nueva meta"}</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Correr 5km sin parar"
              className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"/>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Descripción</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="¿Qué quieres lograr exactamente?"
              rows={2}
              className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50 resize-none"/>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Compromiso</label>
            <input value={commitment} onChange={e => setCommitment(e.target.value)}
              placeholder="¿Qué entregas si no lo logras?"
              className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"/>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1"><CalendarDays size={11}/> Fecha límite</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-green-500/50"/>
          </div>

          {habits.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Hábitos vinculados</label>
              <div className="flex flex-wrap gap-2">
                {habits.map(h => {
                  const active = selectedHabits.includes(h.id)
                  return (
                    <button key={h.id} onClick={() => toggleHabit(h.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                        ${active
                          ? "bg-green-500/20 border-green-500/50 text-green-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                      {active && <Check size={10} className="inline mr-1"/>}
                      {h.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-700/40">
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-sm font-semibold text-black transition-colors">
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear meta"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, habits, onEdit, onDelete }: {
  goal: Goal
  habits: Habit[]
  onEdit: () => void
  onDelete: () => void
}) {
  const linked = habits.filter(h => goal.habit_ids.includes(h.id))
  const dl = goal.deadline ? daysLeft(goal.deadline) : null
  const isOverdue = dl?.color === "text-red-400"

  return (
    <div className={`gc rounded-2xl overflow-hidden transition-all ${isOverdue ? "!border-red-500/30" : ""}`}>
      <div className="p-4 space-y-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Target size={16} className="text-amber-400 shrink-0"/>
            <h3 className="font-semibold text-zinc-100 truncate">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <Pencil size={13}/>
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={13}/>
            </button>
          </div>
        </div>

        {/* Description */}
        {goal.description && (
          <p className="text-sm text-zinc-400 leading-snug">{goal.description}</p>
        )}

        {/* Commitment */}
        {goal.commitment && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-amber-400 font-medium">Compromiso</p>
            <p className="text-xs text-zinc-300 mt-0.5">{goal.commitment}</p>
          </div>
        )}

        {/* Deadline */}
        {goal.deadline && (
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className={dl?.color}/>
            <span className={`text-xs ${dl?.color}`}>
              {fmtDate(goal.deadline)} · {dl?.label}
            </span>
          </div>
        )}

        {/* Linked habits */}
        {linked.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linked.map(h => (
              <span key={h.id} className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-400">
                <Flame size={10} className="text-amber-400"/>
                {h.name}
              </span>
            ))}
          </div>
        )}

        {linked.length === 0 && (
          <p className="text-xs text-zinc-600 italic">Sin hábitos vinculados</p>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals]   = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Goal | undefined>(undefined)

  async function load() {
    const [g, h] = await Promise.all([getGoals(), getHabits()])
    setGoals(g)
    setHabits(h)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(data: Partial<Goal>, habitIds: string[]) {
    if (editing) {
      const updated = await updateGoal(editing.id, data)
      const prev = editing.habit_ids
      const toAdd = habitIds.filter(id => !prev.includes(id))
      const toRemove = prev.filter(id => !habitIds.includes(id))
      await Promise.all([
        ...toAdd.map(id => attachHabit(updated.id, id)),
        ...toRemove.map(id => detachHabit(updated.id, id)),
      ])
    } else {
      const goal = await createGoal(data as Omit<Goal, "id" | "created_at" | "habit_ids">)
      await Promise.all(habitIds.map(id => attachHabit(goal.id, id)))
    }
    await load()
  }

  async function handleDelete(id: number) {
    await deleteGoal(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-10">

      {/* Header */}
      <div className="px-4 pt-4 pb-4 bg-[var(--sticky-bg)] border-b border-slate-700/40 sticky top-[128px] z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Metas</h1>
            <p className="text-xs text-zinc-500">Objetivos vinculados a tus hábitos</p>
          </div>
          <button onClick={() => { setEditing(undefined); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">
            <Plus size={14}/> Nueva meta
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-2xl animate-pulse"/>)}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Target size={36} className="text-zinc-700 mx-auto"/>
            <p className="text-zinc-500 text-sm">Sin metas todavía</p>
            <button onClick={() => { setEditing(undefined); setShowModal(true) }}
              className="px-4 py-2 rounded-xl border border-dashed border-zinc-700 text-zinc-500 text-sm hover:border-green-500/50 hover:text-green-400 transition-colors">
              Crear primera meta
            </button>
          </div>
        ) : (
          goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} habits={habits}
              onEdit={() => { setEditing(goal); setShowModal(true) }}
              onDelete={() => handleDelete(goal.id)}/>
          ))
        )}
      </div>

      {showModal && (
        <GoalModal
          initial={editing}
          habits={habits}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
