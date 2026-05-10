"use client"

const COL = 44          // px por semana
const H   = 180
const PAD_TOP = 14
const PAD_BOT = 38
const PAD_L   = 34      // espacio para etiquetas Y
const PAD_R   = 12
const PLOT_H  = H - PAD_TOP - PAD_BOT

interface Point { label: string; pct: number }

function yPos(pct: number) {
  return PAD_TOP + PLOT_H * (1 - pct / 100)
}

export function TrendChart({ data, showAllLabels = false }: { data: Point[]; showAllLabels?: boolean }) {
  if (!data.length) return (
    <p className="text-xs text-zinc-600 text-center py-8">Sin datos aún</p>
  )

  const W        = PAD_L + data.length * COL + PAD_R
  const BASELINE = PAD_TOP + PLOT_H   // y de 0 %

  const pts = data.map((d, i) => ({
    x: PAD_L + i * COL + COL / 2,
    y: yPos(d.pct),
    pct: d.pct,
    label: d.label,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const areaPath = `${linePath} L${pts[pts.length-1].x},${BASELINE} L${pts[0].x},${BASELINE} Z`

  function showLabel(i: number) {
    if (i === 0 || showAllLabels) return true
    return data[i].label.split("/")[1] !== data[i-1].label.split("/")[1]
  }

  return (
    <div className="overflow-x-auto"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
      <svg width={W} height={H} className="block">
        <defs>
          {/* Glow EKG */}
          <filter id="ekgGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Área bajo la curva */}
          <linearGradient id="ekgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Líneas de cuadrícula horizontales + etiquetas Y */}
        {[100, 75, 50, 25, 0].map(pct => (
          <g key={pct}>
            <line
              x1={PAD_L} y1={yPos(pct)} x2={W - PAD_R} y2={yPos(pct)}
              stroke="#27272a" strokeWidth="1"
              strokeDasharray={pct === 0 || pct === 100 ? "0" : "4 6"}
            />
            <text
              x={PAD_L - 5} y={yPos(pct) + 3.5}
              textAnchor="end" fontSize="9" fill="#52525b">
              {pct}%
            </text>
          </g>
        ))}

        {/* Área */}
        <path d={areaPath} fill="url(#ekgArea)"/>

        {/* Línea EKG */}
        <path
          d={linePath} fill="none"
          stroke="#22c55e" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
          filter="url(#ekgGlow)"
        />

        {/* Puntos */}
        {pts.map((p, i) => (
          <circle key={i}
            cx={p.x} cy={p.y} r="2.5"
            fill="#22c55e" stroke="#09090b" strokeWidth="1.5"
            filter="url(#ekgGlow)"
          />
        ))}

        {/* Etiquetas X — sólo en cambios de mes */}
        {pts.map((p, i) => showLabel(i) && (
          <g key={i}>
            <line
              x1={p.x} y1={BASELINE} x2={p.x} y2={BASELINE + 4}
              stroke="#3f3f46" strokeWidth="1"
            />
            <text
              x={p.x} y={H - 5}
              textAnchor="middle" fontSize="9" fill="#71717a">
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
