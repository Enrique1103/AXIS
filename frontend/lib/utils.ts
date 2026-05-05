import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns"
import { es } from "date-fns/locale"

export const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

export const DAYS_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]

export function formatDateHeader(d: Date): string {
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

export function daysInMonth(year: number, month: number): number {
  return getDaysInMonth(new Date(year, month - 1, 1))
}

// Returns 0=Mon ... 6=Sun offset for the first day of the month
export function firstWeekdayOffset(year: number, month: number): number {
  const d = startOfMonth(new Date(year, month - 1, 1))
  const day = getDay(d) // 0=Sun...6=Sat
  return day === 0 ? 6 : day - 1
}

export function streak(
  summary: Record<string, number>,
  habitCount: number,
  year: number,
  month: number,
): { current: number; best: number } {
  const days = daysInMonth(year, month)
  let best = 0, run = 0
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    if ((summary[key] ?? 0) >= habitCount) { run++; best = Math.max(best, run) }
    else run = 0
  }

  // current streak ending at today
  const today = new Date()
  let current = 0
  let check = new Date(Math.min(today.getTime(), new Date(year, month - 1, days).getTime()))
  while (check >= new Date(year, month - 1, 1)) {
    const key = toISODate(check)
    if ((summary[key] ?? 0) >= habitCount) { current++; check.setDate(check.getDate() - 1) }
    else break
  }

  return { current, best }
}
