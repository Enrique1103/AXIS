export interface Habit {
  id: number
  name: string
  icon: string
  color: string
  ord: number
  active: boolean
  created_at: string
}

export type HabitState = 'done' | 'rest' | 'failed'

export interface DayRecords {
  [habitId: number]: HabitState
}

export interface MonthSummary {
  [date: string]: number
}

export interface HabitMonthStats {
  [habitId: number]: number
}

export interface Task {
  id: number
  title: string
  type: "daily" | "weekly" | "monthly"
  deadline: string | null
  completed: boolean
  created_at: string
}
