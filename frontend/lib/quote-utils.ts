import { QUOTES, Quote } from "./quotes"

const KEY_HABIT_TIME  = "axis_habit_time"
const KEY_QUOTE_TIME  = "axis_quote_time"
const KEY_QUOTE_COUNT = "axis_quote_count"

export interface QuoteSettings {
  habitTime:  string
  quoteTime:  string
  quoteCount: 1 | 2
}

export function getSettings(): QuoteSettings {
  if (typeof window === "undefined") return { habitTime: "21:00", quoteTime: "07:30", quoteCount: 1 }
  return {
    habitTime:  localStorage.getItem(KEY_HABIT_TIME)  ?? "21:00",
    quoteTime:  localStorage.getItem(KEY_QUOTE_TIME)  ?? "07:30",
    quoteCount: (Number(localStorage.getItem(KEY_QUOTE_COUNT) ?? "1") as 1 | 2),
  }
}

export function saveSettings(s: QuoteSettings) {
  localStorage.setItem(KEY_HABIT_TIME,  s.habitTime)
  localStorage.setItem(KEY_QUOTE_TIME,  s.quoteTime)
  localStorage.setItem(KEY_QUOTE_COUNT, String(s.quoteCount))
}

// Seeded shuffle using today's date so quotes are stable within a day
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function getDailyQuotes(count: 1 | 2): Quote[] {
  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const rng = seededRandom(seed)

  const shuffled = [...QUOTES]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
