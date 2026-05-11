"use client"

const EMOJIS = ["😴", "😵", "😞", "😔", "😐", "🙂", "😊", "😄", "🤩", "🥳"]

export function MoodEmoji({ level }: { level: number }) {
  return (
    <span style={{ fontSize: 16, lineHeight: 1 }}>
      {EMOJIS[level - 1]}
    </span>
  )
}
