"use client"

import { Task } from "@/lib/types"

const NODE_W   = 190
const NODE_H   = 58
const COL_GAP  = 96
const ROW_GAP  = 14
const PADDING  = 24

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

// Longest-path layout — assigns each node to its critical-path column
function computeLayout(tasks: Task[]): Map<number, { x: number; y: number }> {
  const ids = new Set(tasks.map(t => t.id))

  // Only deps that exist within this tab's task set
  const deps = new Map(tasks.map(t => [t.id, t.dep_ids.filter(d => ids.has(d))]))

  const level = new Map<number, number>()

  function lvl(id: number, stack = new Set<number>()): number {
    if (level.has(id)) return level.get(id)!
    if (stack.has(id))  return 0 // cycle guard
    stack.add(id)
    const d = deps.get(id) ?? []
    const l = d.length === 0 ? 0 : Math.max(...d.map(dep => lvl(dep, stack) + 1))
    level.set(id, l)
    return l
  }
  tasks.forEach(t => lvl(t.id))

  // Group nodes per column
  const cols = new Map<number, number[]>()
  level.forEach((l, id) => {
    if (!cols.has(l)) cols.set(l, [])
    cols.get(l)!.push(id)
  })

  const positions = new Map<number, { x: number; y: number }>()
  cols.forEach((colIds, col) => {
    const x = PADDING + col * (NODE_W + COL_GAP)
    colIds.forEach((id, row) => {
      positions.set(id, { x, y: PADDING + row * (NODE_H + ROW_GAP) })
    })
  })
  return positions
}

// ── Component ────────────────────────────────────────────────────────────────

export function TaskGraph({ tasks, allTasks }: { tasks: Task[]; allTasks: Task[] }) {
  if (tasks.length === 0) return null

  const pos   = computeLayout(tasks)
  const idSet = new Set(tasks.map(t => t.id))
  const today = getToday()

  const xs   = [...pos.values()].map(p => p.x)
  const ys   = [...pos.values()].map(p => p.y)
  const svgW = Math.max(...xs) + NODE_W + PADDING * 2
  const svgH = Math.max(...ys) + NODE_H + PADDING * 2

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-2xl border border-slate-700/30 bg-zinc-950/60">
      <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>
        <defs>
          <marker id="tip" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,1 L0,6 L6,3.5 z" fill="#52525b"/>
          </marker>
          <marker id="tip-done" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,1 L0,6 L6,3.5 z" fill="#22c55e60"/>
          </marker>
        </defs>

        {/* ── Edges ── */}
        {tasks.flatMap(task =>
          task.dep_ids
            .filter(depId => idSet.has(depId))
            .map(depId => {
              const from = pos.get(depId)
              const to   = pos.get(task.id)
              if (!from || !to) return null

              const x1 = from.x + NODE_W
              const y1 = from.y + NODE_H / 2
              const x2 = to.x
              const y2 = to.y + NODE_H / 2
              const mx = (x1 + x2) / 2

              const depDone = tasks.find(t => t.id === depId)?.completed
              return (
                <path
                  key={`${depId}-${task.id}`}
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

        {/* ── Nodes ── */}
        {tasks.map(task => {
          const p = pos.get(task.id)
          if (!p) return null

          const blocked = isBlocked(task, allTasks)
          const overdue = !task.completed && !!task.deadline && task.deadline < today
          const subs    = allTasks.filter(t => t.parent_task_id === task.id).length

          const border  = task.completed ? "#22c55e"
                        : blocked        ? "#3f3f46"
                        : overdue        ? "#ef444480"
                        : "#52525b"

          const bg      = task.completed ? "rgba(34,197,94,0.07)"
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

          const label   = task.title.length > 21
                        ? task.title.slice(0, 21) + "…"
                        : task.title

          const hasMeta = !!task.deadline || subs > 0
          const titleY  = p.y + NODE_H / 2 + (hasMeta ? -7 : 4)
          const metaY   = p.y + NODE_H / 2 + 9

          return (
            <g key={task.id}>
              {/* Card */}
              <rect
                x={p.x} y={p.y}
                width={NODE_W} height={NODE_H}
                rx="10"
                fill={bg}
                stroke={border}
                strokeWidth="1.5"
              />

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

              {/* Meta row: deadline + subtasks */}
              {hasMeta && (
                <text x={p.x + 26} y={metaY} fontSize="9" fill={overdue ? "#f87171" : "#71717a"}>
                  {task.deadline ? fmt(task.deadline) : ""}
                  {task.deadline && subs > 0 ? "  ·  " : ""}
                  {subs > 0 ? `${subs} sub` : ""}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
