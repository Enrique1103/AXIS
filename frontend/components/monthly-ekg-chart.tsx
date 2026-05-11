"use client"

import { memo, useMemo } from "react"

type RecordMatrix = Record<string, Record<number, string>>

interface Props {
  matrix:     RecordMatrix
  habitCount: number
  year:       number
  month:      number
  todayStr:   string
}

function ds(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

const CHART_H   = 150  // px, SVG chart area
const X_LABEL_H = 18   // px, bottom day numbers
const Y_LABEL_W = 30   // px, left % labels

export const MonthlyEKGChart = memo(function MonthlyEKGChart({ matrix, habitCount, year, month, todayStr }: Props) {
  const days = new Date(year, month, 0).getDate()

  // pct per day — ALL days of month (0 if no data)
  const data = useMemo(() =>
    Array.from({ length: days }, (_, i) => {
      const d     = i + 1
      const date  = ds(year, month, d)
      const rec   = matrix[date] ?? {}
      const done  = Object.values(rec).filter(v => v === 'done').length
      return habitCount > 0 ? done / habitCount : 0
    }),
  [matrix, habitCount, year, month, days])

  // SVG uses viewBox "0 0 100 100" — x and y are percentages
  const ptX = (i: number) => days > 1 ? (i / (days - 1)) * 100 : 0
  const ptY = (pct: number) => (1 - pct) * 100

  const linePath = data
    .map((pct, i) => `${i === 0 ? "M" : "L"} ${ptX(i).toFixed(2)} ${ptY(pct).toFixed(2)}`)
    .join(" ")

  const areaPath =
    `${linePath} L ${ptX(days - 1).toFixed(2)} 100 L 0 100 Z`

  const todayIdx = (() => {
    for (let i = days - 1; i >= 0; i--) {
      if (ds(year, month, i + 1) <= todayStr) return i
    }
    return -1
  })()

  return (
    <div className="relative" style={{ paddingLeft: Y_LABEL_W }}>

      {/* ── Y axis labels (HTML, no SVG distortion) ── */}
      <div
        className="absolute left-0 top-0"
        style={{ width: Y_LABEL_W, height: CHART_H }}
      >
        {[100, 75, 50, 25, 0].map(pct => (
          <span
            key={pct}
            className="absolute right-1 text-[8px] text-zinc-500 leading-none -translate-y-1/2"
            style={{ top: `${(1 - pct / 100) * 100}%` }}
          >
            {pct}%
          </span>
        ))}
      </div>

      {/* ── SVG chart (only lines, no text) ── */}
      <svg
        width="100%"
        height={CHART_H}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="areaGM" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fb923c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0"   />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => (
          <line
            key={pct}
            x1="0" y1={pct} x2="100" y2={pct}
            stroke="rgba(51,65,85,0.35)" strokeWidth="0.15"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGM)" />

        {/* Glow layer */}
        <path
          d={linePath} fill="none"
          stroke="rgba(251,146,60,0.35)" strokeWidth="5"
          strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Main line */}
        <path
          d={linePath} fill="none"
          stroke="#fb923c" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

      </svg>

      {/* ── X axis: all day numbers (HTML, absolutely positioned) ── */}
      <div
        className="relative"
        style={{ height: X_LABEL_H, marginTop: 2 }}
      >
        {Array.from({ length: days }, (_, i) => {
          const d    = i + 1
          const date = ds(year, month, d)
          const isToday = date === todayStr
          return (
            <span
              key={d}
              className={`absolute text-[8px] leading-none -translate-x-1/2
                ${isToday ? "text-blue-400 font-bold" : "text-zinc-600"}`}
              style={{ left: `${ptX(i)}%`, top: 2 }}
            >
              {d}
            </span>
          )
        })}
      </div>
    </div>
  )
})
