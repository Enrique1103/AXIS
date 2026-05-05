"use client"

import { useMemo } from "react"

interface SankeyData {
  completed: number
  pending:   number
  overdue:   number
}

const W   = 300
const H   = 160
const NW  = 13   // node width
const PAD = 5
const GAP = 5    // gap between target nodes

export function SankeyChart({ data }: { data: SankeyData }) {
  const total = data.completed + data.pending + data.overdue

  const nodes = useMemo(() => {
    const innerH = H - 2 * PAD
    const cPct = total > 0 ? data.completed / total : 0
    const pPct = total > 0 ? data.pending   / total : 0

    // Source node: split in 3 colored sections (no gap)
    const cH = cPct * innerH
    const pH = pPct * innerH
    const src = {
      comp: { y1: PAD,           y2: PAD + cH           },
      pend: { y1: PAD + cH,      y2: PAD + cH + pH      },
      over: { y1: PAD + cH + pH, y2: PAD + innerH       },
    }

    // Target nodes: proportional with gaps
    const availH = innerH - 2 * GAP
    const tCH = Math.max(5, cPct * availH)
    const tPH = Math.max(5, pPct * availH)
    const tOH = Math.max(5, availH - tCH - tPH)
    const tgt = {
      comp: { y1: PAD,                                y2: PAD + tCH },
      pend: { y1: PAD + tCH + GAP,                   y2: PAD + tCH + GAP + tPH },
      over: { y1: PAD + tCH + GAP + tPH + GAP,       y2: PAD + tCH + GAP + tPH + GAP + tOH },
    }

    return { src, tgt, innerH }
  }, [data, total])

  if (total === 0) return (
    <p className="text-center text-xs text-zinc-600 py-4">Sin tareas registradas</p>
  )

  const sx = PAD + NW           // right edge of source node
  const tx = W - PAD - NW       // left edge of target nodes
  const mx = (sx + tx) / 2      // bezier midpoint

  function band(s: { y1: number; y2: number }, t: { y1: number; y2: number }, fill: string) {
    const d = [
      `M ${sx} ${s.y1}`,
      `C ${mx} ${s.y1} ${mx} ${t.y1} ${tx} ${t.y1}`,
      `L ${tx} ${t.y2}`,
      `C ${mx} ${t.y2} ${mx} ${s.y2} ${sx} ${s.y2} Z`,
    ].join(" ")
    return <path key={fill} d={d} fill={fill} opacity="0.2" />
  }

  const pct = (n: number) => total > 0 ? Math.round(n / total * 100) : 0

  const COLORS = { comp: "#22c55e", pend: "#f59e0b", over: "#ef4444" }
  const { src, tgt } = nodes

  return (
    <div className="flex items-stretch gap-0">

      {/* ── Left label ── */}
      <div className="w-[68px] shrink-0 flex flex-col justify-center items-end pr-3">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500">Creadas</p>
        <p className="text-3xl font-bold text-zinc-300 tabular-nums leading-tight">{total}</p>
      </div>

      {/* ── SVG chart ── */}
      <div className="flex-1 relative" style={{ height: H }}>
        <svg
          width="100%" height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Bezier bands */}
          {band(src.comp, tgt.comp, COLORS.comp)}
          {band(src.pend, tgt.pend, COLORS.pend)}
          {band(src.over, tgt.over, COLORS.over)}

          {/* Source node — 3 coloured sections */}
          <rect x={PAD} y={src.comp.y1} width={NW} height={src.comp.y2 - src.comp.y1} fill={COLORS.comp} rx="2" opacity="0.85"/>
          <rect x={PAD} y={src.pend.y1} width={NW} height={src.pend.y2 - src.pend.y1} fill={COLORS.pend} rx="2" opacity="0.85"/>
          <rect x={PAD} y={src.over.y1} width={NW} height={src.over.y2 - src.over.y1} fill={COLORS.over} rx="2" opacity="0.85"/>

          {/* Target nodes */}
          <rect x={W-PAD-NW} y={tgt.comp.y1} width={NW} height={tgt.comp.y2 - tgt.comp.y1} fill={COLORS.comp} rx="2"/>
          <rect x={W-PAD-NW} y={tgt.pend.y1} width={NW} height={tgt.pend.y2 - tgt.pend.y1} fill={COLORS.pend} rx="2"/>
          <rect x={W-PAD-NW} y={tgt.over.y1} width={NW} height={tgt.over.y2 - tgt.over.y1} fill={COLORS.over} rx="2"/>
        </svg>
      </div>

      {/* ── Right labels — aligned to target node centres ── */}
      <div className="w-[108px] shrink-0 relative pl-3" style={{ height: H }}>
        {[
          { node: tgt.comp, color: COLORS.comp, label: "Completadas", count: data.completed },
          { node: tgt.pend, color: COLORS.pend, label: "En curso",    count: data.pending   },
          { node: tgt.over, color: COLORS.over, label: "Vencidas",    count: data.overdue   },
        ].map(({ node, color, label, count }) => {
          const midY = (node.y1 + node.y2) / 2
          return (
            <div key={label} className="absolute left-3"
              style={{ top: midY, transform: "translateY(-50%)" }}>
              <p className="text-xs font-bold tabular-nums leading-none" style={{ color }}>
                {count}
                <span className="text-[9px] font-normal opacity-60 ml-1">({pct(count)}%)</span>
              </p>
              <p className="text-[9px] text-zinc-500 leading-tight mt-0.5">{label}</p>
            </div>
          )
        })}
      </div>

    </div>
  )
}
