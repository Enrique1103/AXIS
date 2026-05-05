"use client"

import { useRef } from "react"
import { Check, X } from "lucide-react"

interface HabitCellProps {
  state: boolean | undefined
  isToday: boolean
  isPast: boolean
  onComplete: () => void
  onNotComplete: () => void
  size?: "sm" | "md"
}

export function HabitCell({ state, isToday, isPast, onComplete, onNotComplete, size = "md" }: HabitCellProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickCount = useRef(0)

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8"
  const iconSize = size === "md" ? 13 : 11

  const bg =
    state === true  ? "bg-green-500 shadow-green-500/30 shadow-sm" :
    state === false ? "bg-red-500 shadow-red-500/30 shadow-sm" :
    isPast          ? "bg-zinc-800" : "bg-zinc-800/30"

  const ring = isToday ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-950" : ""
  const opacity = !isPast && state === undefined ? "opacity-25" : ""

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-lg cursor-pointer select-none
        transition-all duration-150 active:scale-90 ${bg} ${ring} ${opacity}`}
      // ── Mobile: touch events ─────────────────────────────────────────────
      onTouchStart={(e) => {
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        isLongPress.current = false
        pressTimer.current = setTimeout(() => {
          isLongPress.current = true
          onNotComplete()
        }, 500)
      }}
      onTouchEnd={(e) => {
        if (!touchStartPos.current) return
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartPos.current.x)
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartPos.current.y)
        if (pressTimer.current) clearTimeout(pressTimer.current)
        // Only handle if it was a tap (not a scroll)
        if (dx < 10 && dy < 10) {
          e.preventDefault()
          if (!isLongPress.current) onComplete()
        }
        touchStartPos.current = null
      }}
      onTouchCancel={() => {
        if (pressTimer.current) clearTimeout(pressTimer.current)
        touchStartPos.current = null
      }}
      // ── Desktop: click events ────────────────────────────────────────────
      onClick={() => {
        clickCount.current++
        if (clickTimer.current) clearTimeout(clickTimer.current)
        clickTimer.current = setTimeout(() => {
          if (clickCount.current === 1) onComplete()
          else onNotComplete()
          clickCount.current = 0
        }, 250)
      }}
    >
      {state === true  && <Check size={iconSize} strokeWidth={3} className="text-white" />}
      {state === false && <X    size={iconSize} strokeWidth={3} className="text-white" />}
    </div>
  )
}
