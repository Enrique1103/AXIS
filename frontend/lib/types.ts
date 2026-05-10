export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  ord: number
  active: boolean
  created_at: string
}

export type HabitState = 'done' | 'rest' | 'failed'

export interface DayRecords {
  [habitId: string]: HabitState
}

export interface MonthSummary {
  [date: string]: number
}

export interface HabitMonthStats {
  [habitId: string]: number
}

export interface Task {
  id: number
  title: string
  type: "daily" | "weekly" | "monthly"
  deadline: string | null
  completed: boolean
  created_at: string
}
