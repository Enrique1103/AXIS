"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Check, CalendarDays, X } from "lucide-react"
import { getTasks, createTask, updateTask, deleteTask } from "@/lib/api"
import { Task } from "@/lib/types"
import { SankeyChart } from "@/components/sankey-chart"

type TabKey = "daily" | "weekly" | "monthly"

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "daily",   label: "Diarias",   color: "text-green-400"  },
  { key: "weekly",  label: "Semanales", color: "text-blue-400"   },
  { key: "monthly", label: "Mensuales", color: "text-violet-400" },
]

function isOverdue(task: Task) {
  if (!task.deadline || task.completed) return false
  return task.deadline < new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export default function TasksPage() {
  const [tab, setTab]     = useState<TabKey>("daily")
  const [tasks, setTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle]       = useState("")
  const [newDeadline, setNewDeadline] = useState("")
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  function loadAll() { getTasks().then(setAllTasks) }

  useEffect(() => {
    setLoading(true)
    getTasks(tab).then(t => { setTasks(t); setLoading(false) })
  }, [tab])

  useEffect(() => { loadAll() }, [])

  async function handleAdd() {
    if (!newTitle.trim() || saving) return
    setSaving(true)
    try {
      const t = await createTask({
        title: newTitle.trim(),
        type: tab,
        deadline: newDeadline || undefined,
      })
      setTasks(prev => [t, ...prev])
      setNewTitle("")
      setNewDeadline("")
      setShowForm(false)
      loadAll()
    } finally { setSaving(false) }
  }

  async function handleToggle(task: Task) {
    const updated = await updateTask(task.id, { completed: !task.completed })
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    loadAll()
  }

  async function handleDelete(id: number) {
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    loadAll()
  }

  const sankeyData = {
    completed: allTasks.filter(t => t.completed).length,
    overdue:   allTasks.filter(t => !t.completed && t.deadline && t.deadline < today).length,
    pending:   allTasks.filter(t => !t.completed && (!t.deadline || t.deadline >= today)).length,
  }

  const pending   = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">

      {/* Header */}
      <div className="px-4 pt-4 pb-4 bg-[var(--sticky-bg)] border-b border-slate-700/40 sticky top-[128px] z-10">
        <h1 className="text-lg font-bold mb-3">Tareas</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-800/60 p-1 rounded-xl">
          {TABS.map(({ key, label, color }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === key ? `bg-zinc-900 ${color}` : "text-zinc-500 hover:text-zinc-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Análisis de Fuga de Energía ── */}
        {allTasks.length > 0 && (
          <div className="gc p-4"
            style={{ borderColor: sankeyData.overdue > 0 ? "rgba(239,68,68,0.25)" : undefined }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Análisis de Fuga de Energía</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Flujo de todas tus tareas · {allTasks.length} en total
                </p>
              </div>
              {sankeyData.overdue > 0 && (
                <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20
                  px-2 py-1 rounded-lg font-medium shrink-0">
                  ⚡ {sankeyData.overdue} vencida{sankeyData.overdue > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <SankeyChart data={sankeyData} />
          </div>
        )}

        {/* Form para nueva tarea */}
        {showForm ? (
          <div className="gc p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Nueva tarea</p>
              <button onClick={() => { setShowForm(false); setNewTitle(""); setNewDeadline("") }}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X size={15}/>
              </button>
            </div>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Título de la tarea…"
              className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100
                placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-zinc-500 shrink-0"/>
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300
                  focus:outline-none focus:ring-1 focus:ring-green-500/50"
              />
              <span className="text-xs text-zinc-600">plazo (opc.)</span>
            </div>
            <button onClick={handleAdd} disabled={!newTitle.trim() || saving}
              className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40
                text-sm font-semibold text-black transition-colors">
              {saving ? "Guardando…" : "Agregar tarea"}
            </button>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-2 py-3 px-4 rounded-2xl border border-dashed
              border-zinc-700 text-zinc-500 hover:border-green-500/50 hover:text-green-400 transition-colors">
            <Plus size={16}/>
            <span className="text-sm">Agregar {TABS.find(t=>t.key===tab)?.label.toLowerCase().replace("es","")}</span>
          </button>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse"/>)}
          </div>
        ) : (
          <>
            {/* Pendientes */}
            {pending.length > 0 && (
              <div className="space-y-2">
                {pending.map(task => (
                  <TaskCard key={task.id} task={task}
                    onToggle={() => handleToggle(task)}
                    onDelete={() => handleDelete(task.id)}/>
                ))}
              </div>
            )}

            {/* Completadas */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-zinc-600 px-1 pt-2">
                  Completadas ({completed.length})
                </p>
                {completed.map(task => (
                  <TaskCard key={task.id} task={task}
                    onToggle={() => handleToggle(task)}
                    onDelete={() => handleDelete(task.id)}/>
                ))}
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-12 text-zinc-600">
                <p className="text-sm">Sin tareas {TABS.find(t=>t.key===tab)?.label.toLowerCase()}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onToggle, onDelete }: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  const overdue = isOverdue(task)

  return (
    <div className={`gc rounded-xl flex items-center gap-3 px-3 py-3 transition-all
      ${overdue ? "!border-red-500/40" : ""}`}>

      <button onClick={onToggle}
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
          ${task.completed
            ? "bg-green-500 hover:bg-green-400"
            : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"}`}>
        {task.completed && <Check size={14} className="text-black"/>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug
          ${task.completed ? "line-through text-zinc-500" : "text-zinc-100"}`}>
          {task.title}
        </p>
        {task.deadline && (
          <p className={`text-xs mt-0.5 flex items-center gap-1
            ${overdue ? "text-red-400" : "text-zinc-500"}`}>
            <CalendarDays size={10}/>
            {overdue ? "Vencida · " : ""}{fmtDate(task.deadline)}
          </p>
        )}
      </div>

      <button onClick={onDelete}
        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
        <Trash2 size={14}/>
      </button>
    </div>
  )
}
