"use client"

import { useState } from "react"
import { Task } from "@/lib/types"
import { ChevronLeft } from "lucide-react"

const NODE_W  = 190
const NODE_H  = 58
const COL_GAP = 96
const ROW_GAP = 14
const PAD     = 24

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

// Longest-path column layout
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

  // If no deps exist at all, lay out as a simple horizontal chain
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

// ── Node renderer ─────────────────────────────────────────────────────────────

function GraphNode({ task, p, allTasks, hasSubs, onClick, today }: {
  task: Task
  p: { x: number; y: number }
  allTasks: Task[]
  hasSubs: boolean
  onClick?: () => void
  today: string
}) {
  const blocked = isBlocked(task, allTasks)
  const overdue = !task.completed && !!task.deadline && task.deadline < today

  const border = task.completed ? "#22c55e"
               : blocked        ? "#3f3f46"
               : overdue        ? "#ef444480"
               : "#52525b"

  const bg     = task.completed ? "rgba(34,197,94,0.07)"
               : blocked        ? "rgba(24,24,27,0.55)"
               : overdue        ? "rgba(239,68,68,0.05)"
               : "rgba(39,39,42,0.75)"

  const textCol = task.completed ? "#71717a"
                : blocked        ? "#52525b"
                : "#e4e4e7"

  const dotCol  = task.completed ? "#22c55e"
                : blocked        ? "#3f3f46"
                : overdue        ? "#ef4444"
                : "#71717a"

  const label   = task.title.length > 20 ? task.title.slice(0, 20) + "…" : task.title
  const subs    = allTasks.filter(t => t.parent_task_id === task.id).length
  const hasMeta = !!task.deadline || subs > 0
  const titleY  = p.y + NODE_H / 2 + (hasMeta ? -7 : 4)
  const metaY   = p.y + NODE_H / 2 + 9

  return (
    <g
      onClick={hasSubs ? onClick : undefined}
      style={{ cursor: hasSubs ? "pointer" : "default" }}
    >
      {/* Card */}
      <rect
        x={p.x} y={p.y}
        width={NODE_W} height={NODE_H}
        rx="10"
        fill={bg}
        stroke={hasSubs && !task.completed ? "#3b82f6" : border}
        strokeWidth={hasSubs && !task.completed ? "2" : "1.5"}
      />

      {/* Drill-down indicator */}
      {hasSubs && (
        <text x={p.x + NODE_W - 10} y={p.y + 10}
          textAnchor="middle" fontSize="8" fill="#3b82f680">▼</text>
      )}

      {/* Status dot */}
      <circle cx={p.x + 14} cy={p.y + NODE_H / 2} r="5" fill={dotCol}/>
      {task.completed && (
        <text x={p.x + 14} y={p.y + NODE_H / 2 + 4}
          textAnchor="middle" fontSize="7" fill="#000" fontWeight="bold">✓</text>
      )}
      {blocked && !task.completed && (
        <text x={p.x + 14} y={p.y + NODE_H / 2 + 3}
          textAnchor="middle" fontSize="8" fill="#52525b">⛔</text>
      )}

      {/* Title */}
      <text
        x={p.x + 26} y={titleY}
        fontSize="11.5" fontWeight="500"
        fill={textCol}
        style={{ textDecoration: task.completed ? "line-through" : "none" }}
      >
        {label}
      </text>

      {/* Meta */}
      {hasMeta && (
        <text x={p.x + 26} y={metaY} fontSize="9" fill={overdue ? "#f87171" : "#71717a"}>
          {task.deadline ? fmt(task.deadline) : ""}
          {task.deadline && subs > 0 ? "  ·  " : ""}
          {subs > 0 ? `${subs} paso${subs > 1 ? "s" : ""}` : ""}
        </text>
      )}
    </g>
  )
}

// ── Graph canvas ──────────────────────────────────────────────────────────────

function GraphCanvas({ tasks, allTasks, onNodeClick }: {
  tasks: Task[]
  allTasks: Task[]
  onNodeClick: (task: Task) => void
}) {
  if (tasks.length === 0) return null

  const today  = getToday()
  const pos    = computeLayout(tasks)
  const idSet  = new Set(tasks.map(t => t.id))

  const xs   = [...pos.values()].map(p => p.x)
  const ys   = [...pos.values()].map(p => p.y)
  const svgW = Math.max(...xs) + NODE_W + PAD * 2
  const svgH = Math.max(...ys) + NODE_H + PAD * 2

  return (
    <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>
      <defs>
        <marker id="tip" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,1 L0,6 L6,3.5 z" fill="#52525b"/>
        </marker>
        <marker id="tip-done" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,1 L0,6 L6,3.5 z" fill="#22c55e60"/>
        </marker>
        <marker id="tip-chain" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,1 L0,6 L6,3.5 z" fill="#3f3f46"/>
        </marker>
      </defs>

      {/* Edges from dep_ids */}
      {tasks.flatMap(task =>
        task.dep_ids
          .filter(depId => idSet.has(depId))
          .map(depId => {
            const from = pos.get(depId)
            const to   = pos.get(task.id)
            if (!from || !to) return null
            const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2
            const x2 = to.x,            y2 = to.y  + NODE_H / 2
            const mx = (x1 + x2) / 2
            const depDone = tasks.find(t => t.id === depId)?.completed
            return (
              <path key={`${depId}-${task.id}`}
                d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                stroke={depDone ? "#22c55e50" : "#3f3f46"}
                strokeWidth="1.5"
                strokeDasharray={depDone ? undefined : "5 3"}
                fill="none"
                markerEnd={depDone ? "url(#tip-done)" : "url(#tip)"}
              />
            )
          })
      )}

      {/* Chain arrows between tasks with no deps (sequential hint) */}
      {(() => {
        const hasDeps = tasks.some(t => t.dep_ids.filter(d => idSet.has(d)).length > 0)
        if (hasDeps) return null
        return tasks.slice(0, -1).map((task, i) => {
          const from = pos.get(task.id)
          const to   = pos.get(tasks[i + 1].id)
          if (!from || !to) return null
          const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2
          const x2 = to.x,            y2 = to.y  + NODE_H / 2
          const mx = (x1 + x2) / 2
          return (
            <path key={`chain-${task.id}`}
              d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
              stroke="#27272a"
              strokeWidth="1"
              strokeDasharray="3 4"
              fill="none"
              markerEnd="url(#tip-chain)"
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
            onClick={() => onNodeClick(task)}
          />
        )
      })}
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskGraph({ tasks, allTasks }: { tasks: Task[]; allTasks: Task[] }) {
  const [drill, setDrill] = useState<Task | null>(null)

  if (tasks.length === 0) return null

  const drillSubs = drill
    ? allTasks.filter(t => t.parent_task_id === drill.id)
    : []

  const displayTasks = drill ? drillSubs : tasks

  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      {drill && (
        <div className="flex items-center gap-2 px-1">
          <button onClick={() => setDrill(null)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={13}/>
            Todas las tareas
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">{drill.title}</span>
        </div>
      )}

      {/* Graph */}
      <div className="overflow-x-auto overflow-y-auto rounded-2xl border border-slate-700/30 bg-zinc-950/60">
        {displayTasks.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">
            Esta tarea no tiene pasos definidos aún.
          </div>
        ) : (
          <GraphCanvas
            tasks={displayTasks}
            allTasks={allTasks}
            onNodeClick={(task) => {
              const hasSubs = allTasks.some(t => t.parent_task_id === task.id)
              if (hasSubs) setDrill(task)
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1 pt-1">
        {drill ? (
          <p className="text-[10px] text-zinc-600">
            {drillSubs.filter(t => t.completed).length}/{drillSubs.length} pasos completados · Toca un paso con sub-pasos para profundizar
          </p>
        ) : (
          <p className="text-[10px] text-zinc-600">
            Toca una tarea con pasos <span className="text-blue-500/70">◈</span> para ver su desglose
          </p>
        )}
      </div>
    </div>
  )
}
