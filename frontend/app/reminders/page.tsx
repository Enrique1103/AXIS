"use client"

import { useState, useEffect, useCallback } from "react"
import { AlarmClock, Plus, X, Trash2, Check } from "lucide-react"
import { getReminders, createReminder, updateReminder, deleteReminder } from "@/lib/api"
import { Reminder } from "@/lib/types"

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const ALL_DAYS   = [0, 1, 2, 3, 4, 5, 6]

function scheduleInSW(reminders: Reminder[]) {
  if (!("serviceWorker" in navigator)) return
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: "SCHEDULE_REMINDERS", reminders })
  })
}

async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied"
  if (Notification.permission === "granted") return "granted"
  return Notification.requestPermission()
}

// ── Modal ────────────────────────────────────────────────────────────────────

function ReminderModal({ initial, onSave, onClose }: {
  initial?: Reminder
  onSave: (data: Omit<Reminder, "id" | "created_at">) => Promise<void>
  onClose: () => void
}) {
  const [label,  setLabel]  = useState(initial?.label  ?? "")
  const [time,   setTime]   = useState(initial?.time   ?? "08:00")
  const [days,   setDays]   = useState<number[]>(initial?.days ?? ALL_DAYS)
  const [active, setActive] = useState(initial?.active ?? true)
  const [saving, setSaving] = useState(false)

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  async function handleSave() {
    if (!label.trim() || days.length === 0 || saving) return
    setSaving(true)
    try { await onSave({ label: label.trim(), time, days, active }) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
          <p className="text-sm font-semibold text-zinc-100">
            {initial ? "Editar recordatorio" : "Nuevo recordatorio"}
          </p>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X size={16}/>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Label */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Etiqueta</p>
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="Revisar hábitos del día…"
              className="w-full bg-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Hora</p>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Days */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Días</p>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((lbl, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors
                    ${days.includes(i) ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!label.trim() || days.length === 0 || saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white transition-colors">
              {saving ? "…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [reminders,   setReminders]   = useState<Reminder[]>([])
  const [loading,     setLoading]     = useState(true)
  const [permission,  setPermission]  = useState<NotificationPermission>("default")
  const [showModal,   setShowModal]   = useState(false)
  const [editing,     setEditing]     = useState<Reminder | null>(null)

  const load = useCallback(async () => {
    const data = await getReminders()
    setReminders(data)
    scheduleInSW(data.filter(r => r.active))
    setLoading(false)
  }, [])

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission)
    load()
  }, [load])

  async function handleRequestPermission() {
    const p = await requestPermission()
    setPermission(p)
  }

  async function handleCreate(data: Omit<Reminder, "id" | "created_at">) {
    await createReminder(data)
    setShowModal(false)
    await load()
  }

  async function handleEdit(data: Omit<Reminder, "id" | "created_at">) {
    if (!editing) return
    await updateReminder(editing.id, data)
    setEditing(null)
    await load()
  }

  async function handleToggle(r: Reminder) {
    await updateReminder(r.id, { active: !r.active })
    await load()
  }

  async function handleDelete(id: number) {
    await deleteReminder(id)
    await load()
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 bg-[var(--sticky-bg)] border-b border-slate-700/40 sticky top-[128px] z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Recordatorios</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Avisos push del día</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold transition-colors">
            <Plus size={13}/>
            Nuevo
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Permission banner */}
        {permission !== "granted" && (
          <div className="gc p-4 flex items-start gap-3 border-blue-500/30">
            <AlarmClock size={20} className="text-blue-400 shrink-0 mt-0.5"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100">
                {permission === "denied" ? "Notificaciones bloqueadas" : "Activa las notificaciones"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {permission === "denied"
                  ? "Ve a Configuración del navegador y permite notificaciones para este sitio."
                  : "Recibe recordatorios push aunque el navegador esté en segundo plano."}
              </p>
            </div>
            {permission !== "denied" && (
              <button onClick={handleRequestPermission}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-xs font-semibold text-white transition-colors">
                Permitir
              </button>
            )}
          </div>
        )}

        {/* Reminder list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse"/>)}
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-10 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-1">
              <AlarmClock size={22} className="text-zinc-600"/>
            </div>
            <p className="text-sm font-medium text-zinc-400">Sin recordatorios</p>
            <p className="text-xs text-zinc-600 max-w-[240px]">
              Crea uno para recibir avisos a la hora que elijas.
            </p>
          </div>
        ) : (
          reminders.map(r => (
            <div key={r.id}
              className={`gc rounded-2xl p-4 flex items-center gap-3 transition-all
                ${r.active ? "" : "opacity-50"}`}>
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <AlarmClock size={18} className="text-blue-400"/>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={() => setEditing(r)} role="button">
                <p className="text-sm font-medium text-zinc-200 truncate">{r.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {r.days.length === 7
                    ? "Todos los días"
                    : r.days.map(d => DAY_LABELS[d]).join(" · ")}
                </p>
              </div>

              {/* Time */}
              <span className="text-base font-bold tabular-nums text-zinc-300 shrink-0">{r.time}</span>

              {/* Toggle */}
              <button onClick={() => handleToggle(r)}
                className={`w-9 h-5 rounded-full transition-colors shrink-0 relative
                  ${r.active ? "bg-blue-500" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all
                  ${r.active ? "left-4" : "left-0.5"}`}/>
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(r.id)}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                <Trash2 size={13}/>
              </button>
            </div>
          ))
        )}

        {/* Tip */}
        {reminders.length > 0 && permission === "granted" && (
          <p className="text-xs text-zinc-600 text-center pt-2 flex items-center justify-center gap-1.5">
            <Check size={11} className="text-green-500"/>
            Notificaciones activadas · los recordatorios se programan al abrir la app
          </p>
        )}
      </div>

      {showModal && (
        <ReminderModal onSave={handleCreate} onClose={() => setShowModal(false)}/>
      )}
      {editing && (
        <ReminderModal initial={editing} onSave={handleEdit} onClose={() => setEditing(null)}/>
      )}
    </div>
  )
}
