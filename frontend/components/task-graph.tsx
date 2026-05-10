"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Task } from "@/lib/types"
import { ChevronLeft, X } from "lucide-react"

const NODE_W         = 230
const NODE_H         = 72
const COL_GAP        = 96
const ROW_GAP        = 16
const PAD            = 24
const DRAG_THRESHOLD = 5

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(iso: string) {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function isBlocked(task: Task, all: Task[]) {
  return task.dep_ids.some(id => {
    const dep = all.find(t => t.id === id)
    return dep && !dep.completed
  })
}

// Wrap title into at most 2 lines
function wrapTitle(title: string): [string, string | null] {
  const MAX = 26
  if (title.length <= MAX) return [title, null]
  const brk = title.lastIndexOf(" ", MAX)
  if (brk <= 4) return [title.slice(0, MAX - 1) + "…", null]
  const rest = title.slice(brk + 1)
  return [title.slice(0, brk), rest.length > MAX ? rest.slice(0, MAX - 1) + "…" : rest]
}

function computeLayout(tasks: Task[]): Map<number, { x: number; y: number }> {
  const ids  = new Set(tasks.map(t => t.id))
  const deps = new Map(tasks.map(t => [t.id, t.dep_ids.filter(d => ids.has(d))]))
  const level = new Map<number, number>()

  function lvl(id: number, stack = new Set<number>()): number {
    if (level.has(id)) return level.get(id)!
    if (stack.has(id)) return 0
    stack.add(id)
    const d = deps.get(id) ?? []
    const l = d.length === 0 ? 0 : Math.max(...d.map(dep => lvl(dep, stack) + 1))
    level.set(id, l)
    return l
  }
  tasks.forEach(t => lvl(t.id))

  const cols = new Map<number, number[]>()
  level.forEach((l, id) => {
    if (!cols.has(l)) cols.set(l, [])
    cols.get(l)!.push(id)
  })

  const hasDeps = tasks.some(t => t.dep_ids.filter(d => ids.has(d)).length > 0)
  if (!hasDeps && tasks.length > 1) {
    const positions = new Map<number, { x: number; y: number }>()
    tasks.forEach((t, i) => {
      positions.set(t.id, { x: PAD + i * (NODE_W + COL_GAP), y: PAD })
    })
    return positions
  }

  const positions = new Map<number, { x: number; y: number }>()
  cols.forEach((colIds, col) => {
    const x = PAD + col * (NODE_W + COL_GAP)
    colIds.forEach((id, row) => {
      positions.set(id, { x, y: PAD + row * (NODE_H + ROW_GAP) })
    })
  })
  return positions
}

// ── Add subtask modal ─────────────────────────────────────────────────────────

function AddSubModal({ parent, onAdd, onClose }: {
  parent: Task
  onAdd: (title: string, deadline: string, parentId: number) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle]       = useState("")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving]     = useState(false)

  async function handleAdd() {
    if (!title.trim() || saving) return
    setSaving(true)
    try { await onAdd(title.trim(), deadline, parent.id); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
          <p className="text-sm font-semibold text-zinc-100 truncate">
            Subtarea de <span className="text-zinc-400">"{parent.title}"</span>
          </p>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 shrink-0">
            <X size={16}/>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") onClose() }}
            placeholder="Título de la subtarea…"
            className="w-full bg-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
          />
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-green-500/50"
          />
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button onClick={handleAdd} disabled={!title.trim() || saving}
              className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-xs font-semibold text-black transition-colors">
              {saving ? "…" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Node ─────────────────────────────────────────────────────────────────────

function GraphNode({ task, p, allTasks, hasSubs, onPointerDown, onAddClick, today }: {
  task: Task
  p: { x: number; y: number }
  allTasks: Task[]
  hasSubs: boolean
  onPointerDown: (e: React.PointerEvent<SVGRectElement>) => void
  onAddClick: () => void
  today: string
}) {
  const blocked = isBlocked(task, allTasks)
  const overdue = !task.completed && !!task.deadline && task.deadline < today

  const border  = task.completed ? "#22c55e" : blocked ? "#3f3f46" : overdue ? "#ef444480" : "#52525b"
  const bg      = task.completed ? "rgba(34,197,94,0.07)" : blocked ? "rgba(24,24,27,0.55)" : overdue ? "rgba(239,68,68,0.05)" : "rgba(39,39,42,0.75)"
  const textCol = task.completed ? "#71717a" : blocked ? "#52525b" : "#e4e4e7"
  const dotCol  = task.completed ? "#22c55e" : blocked ? "#3f3f46" : overdue ? "#ef4444" : "#71717a"

  const [line1, line2] = wrapTitle(task.title)
  const hasLine2 = !!line2
  const subs     = allTasks.filter(t => t.parent_task_id === task.id).length
  const hasMeta  = !!task.deadline || subs > 0

  const center = p.y + NODE_H / 2
  let t1y: number, t2y: number | null = null, my: number | null = null
  if (!hasLine2 && !hasMeta) {
    t1y = center + 4
  } else if (!hasLine2 && hasMeta) {
    t1y = center - 7; my = center + 9
  } else if (hasLine2 && !hasMeta) {
    t1y = center - 8; t2y = center + 6
  } else {
    t1y = center - 15; t2y = center - 1; my = center + 15
  }

  const noEvt: React.CSSProperties = { pointerEvents: "none" }

  return (
    <g style={{ cursor: hasSubs ? "pointer" : "default" }}>
      {/* Card — drag zone */}
      <rect
        x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx="10"
        fill={bg}
        stroke={hasSubs && !task.completed ? "#3b82f6" : border}
        strokeWidth={hasSubs && !task.completed ? "2" : "1.5"}
        onPointerDown={onPointerDown}
        style={{ cursor: "grab" }}
      />

      {/* Status dot */}
      <circle cx={p.x + 14} cy={center} r="5" fill={dotCol} style={noEvt}/>
      {task.completed && (
        <text x={p.x + 14} y={center + 4} textAnchor="middle" fontSize="7" fill="#000" fontWeight="bold" style={noEvt}>✓</text>
      )}
      {blocked && !task.completed && (
        <text x={p.x + 14} y={center + 3} textAnchor="middle" fontSize="8" fill="#52525b" style={noEvt}>⛔</text>
      )}

      {/* Title line 1 */}
      <text x={p.x + 26} y={t1y} fontSize="11.5" fontWeight="500" fill={textCol}
        style={{ textDecoration: task.completed ? "line-through" : "none", pointerEvents: "none" }}>
        {line1}
      </text>

      {/* Title line 2 */}
      {hasLine2 && t2y !== null && (
        <text x={p.x + 26} y={t2y} fontSize="11.5" fontWeight="500" fill={textCol}
          style={{ textDecoration: task.completed ? "line-through" : "none", pointerEvents: "none" }}>
          {line2}
        </text>
      )}

      {/* Meta row */}
      {hasMeta && my !== null && (
        <text x={p.x + 26} y={my} fontSize="9" fill={overdue ? "#f87171" : "#71717a"} style={noEvt}>
          {task.deadline ? fmt(task.deadline) : ""}
          {task.deadline && subs > 0 ? "  ·  " : ""}
          {subs > 0 ? `${subs} paso${subs > 1 ? "s" : ""}` : ""}
        </text>
      )}

      {/* "+" add subtask button — stopPropagation prevents drag */}
      <g
        onClick={e => { e.stopPropagation(); onAddClick() }}
        onPointerDown={e => e.stopPropagation()}
        style={{ cursor: "pointer" }}
      >
        <circle cx={p.x + NODE_W - 14} cy={p.y + 14} r="11" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
        <text x={p.x + NODE_W - 14} y={p.y + 19} textAnchor="middle" fontSize="15" fill="#52525b" fontWeight="300">+</text>
      </g>
    </g>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

function GraphCanvas({ tasks, allTasks, onNodeClick, onAddSubtask }: {
  tasks: Task[]
  allTasks: Task[]
  onNodeClick: (task: Task) => void
  onAddSubtask: (task: Task) => void
}) {
  const taskKey  = useMemo(() => tasks.map(t => t.id).join("-"), [tasks])
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const [positions, setPositions] = useState<Map<number, { x: number; y: number }>>(
    () => computeLayout(tasks)
  )
  const [isDragging, setIsDragging] = useState(false)

  const svgRef   = useRef<SVGSVGElement>(null)
  const dragRef  = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null)
  const hasMoved = useRef(false)

  useEffect(() => {
    setPositions(computeLayout(tasksRef.current))
  }, [taskKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (tasks.length === 0) return null

  const today = getToday()
  const idSet  = new Set(tasks.map(t => t.id))
  const pos    = positions
  const xs     = [...pos.values()].map(p => p.x)
  const ys     = [...pos.values()].map(p => p.y)
  const svgW   = Math.max(460, Math.max(...xs) + NODE_W + PAD * 2)
  const svgH   = Math.max(120, Math.max(...ys) + NODE_H + PAD * 2)

  function onNodePointerDown(e: React.PointerEvent<SVGRectElement>, taskId: number) {
    e.preventDefault()
    const p = pos.get(taskId)
    if (!p) return
    hasMoved.current = false
    dragRef.current  = { id: taskId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y }
    svgRef.current?.setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!hasMoved.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      hasMoved.current = true
    }
    if (hasMoved.current) {
      setPositions(prev => new Map(prev).set(d.id, {
        x: Math.max(0, d.ox + dx),
        y: Math.max(0, d.oy + dy),
      }))
    }
  }

  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = dragRef.current
    dragRef.current = null
    setIsDragging(false)
    svgRef.current?.releasePointerCapture(e.pointerId)

    if (!hasMoved.current && d !== null) {
      const task = tasks.find(t => t.id === d.id)
      if (task && allTasks.some(t => t.parent_task_id === task.id)) {
        onNodeClick(task)
      }
    }
  }

  return (
    <svg
      ref={svgRef}
      width={svgW} height={svgH}
      style={{ display: "block", minWidth: svgW, cursor: isDragging ? "grabbing" : "default" }}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <defs>
        <marker id="tip"       markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,1 L0,6 L6,3.5 z" fill="#52525b"/>
        </marker>
        <marker id="tip-done"  markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,1 L0,6 L6,3.5 z" fill="#22c55e60"/>
        </marker>
        <marker id="tip-chain" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,1 L0,6 L6,3.5 z" fill="#3f3f46"/>
        </marker>
      </defs>

      {/* Dependency edges */}
      {tasks.flatMap(task =>
        task.dep_ids
          .filter(depId => idSet.has(depId))
          .map(depId => {
            const from = pos.get(depId)
            const to   = pos.get(task.id)
            if (!from || !to) return null
            const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2
            const x2 = to.x,            y2 = to.y   + NODE_H / 2
            const mx = (x1 + x2) / 2
            const depDone = tasks.find(t => t.id === depId)?.completed
            return (
              <path key={`${depId}-${task.id}`}
                d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                stroke={depDone ? "#22c55e50" : "#3f3f46"}
                strokeWidth="1.5" strokeDasharray={depDone ? undefined : "5 3"}
                fill="none" markerEnd={depDone ? "url(#tip-done)" : "url(#tip)"}
                style={{ pointerEvents: "none" }}
              />
            )
          })
      )}

      {/* Sequential chain (no deps) */}
      {(() => {
        const hasDeps = tasks.some(t => t.dep_ids.filter(d => idSet.has(d)).length > 0)
        if (hasDeps) return null
        return tasks.slice(0, -1).map((task, i) => {
          const from = pos.get(task.id)
          const to   = pos.get(tasks[i + 1].id)
          if (!from || !to) return null
          const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2
          const x2 = to.x,            y2 = to.y   + NODE_H / 2
          const mx = (x1 + x2) / 2
          return (
            <path key={`chain-${task.id}`}
              d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
              stroke="#27272a" strokeWidth="1" strokeDasharray="3 4"
              fill="none" markerEnd="url(#tip-chain)"
              style={{ pointerEvents: "none" }}
            />
          )
        })
      })()}

      {/* Nodes */}
      {tasks.map(task => {
        const p = pos.get(task.id)
        if (!p) return null
        const hasSubs = allTasks.some(t => t.parent_task_id === task.id)
        return (
          <GraphNode
            key={task.id}
            task={task} p={p}
            allTasks={allTasks}
            hasSubs={hasSubs}
            today={today}
            onPointerDown={e => onNodePointerDown(e, task.id)}
            onAddClick={() => onAddSubtask(task)}
          />
        )
      })}
    </svg>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function TaskGraph({ tasks, allTasks, onAddTask }: {
  tasks: Task[]
  allTasks: Task[]
  onAddTask: (title: string, deadline: string, parentId?: number) => Promise<void>
}) {
  const [drillStack, setDrillStack] = useState<Task[]>([])
  const [addingFor, setAddingFor]   = useState<Task | null>(null)

  if (tasks.length === 0) return null

  const current      = drillStack[drillStack.length - 1] ?? null
  const displayTasks = current
    ? allTasks.filter(t => t.parent_task_id === current.id)
    : tasks

  function drillInto(task: Task) {
    setDrillStack(prev => [...prev, task])
  }

  function drillTo(index: number) {
    setDrillStack(prev => prev.slice(0, index + 1))
  }

  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      {drillStack.length > 0 && (
        <div className="flex items-center gap-1 px-1 flex-wrap">
          <button
            onClick={() => setDrillStack([])}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft size={13}/>
            Todas
          </button>
          {drillStack.map((t, i) => (
            <span key={t.id} className="flex items-center gap-1">
              <span className="text-zinc-700">/</span>
              <button
                onClick={() => i < drillStack.length - 1 ? drillTo(i) : undefined}
                className={`text-xs truncate max-w-[130px] transition-colors
                  ${i === drillStack.length - 1
                    ? "text-zinc-300 font-medium cursor-default"
                    : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {t.title}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="overflow-x-auto overflow-y-auto rounded-2xl border border-slate-700/30 bg-zinc-950/60">
        {displayTasks.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">
            Esta tarea no tiene subtareas. Toca <span className="text-zinc-400">+</span> en un nodo para agregar.
          </div>
        ) : (
          <GraphCanvas
            tasks={displayTasks}
            allTasks={allTasks}
            onNodeClick={drillInto}
            onAddSubtask={setAddingFor}
          />
        )}
      </div>

      {/* Legend */}
      <p className="text-[10px] text-zinc-600 px-1">
        {drillStack.length > 0
          ? `${displayTasks.filter(t => t.completed).length}/${displayTasks.length} completadas · toca el nodo para profundizar · + para subtarea · arrastra para mover`
          : "toca el nodo para ver subtareas · + para agregar subtarea · arrastra para mover"}
      </p>

      {/* Add subtask modal */}
      {addingFor && (
        <AddSubModal
          parent={addingFor}
          onAdd={async (title, deadline, parentId) => {
            await onAddTask(title, deadline, parentId)
          }}
          onClose={() => setAddingFor(null)}
        />
      )}
    </div>
  )
}
