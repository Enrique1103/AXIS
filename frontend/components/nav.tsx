"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BarChart2, Settings } from "lucide-react"

const tabs = [
  { href: "/",         label: "Hoy",     icon: Home },
  { href: "/stats",    label: "Stats",   icon: BarChart2 },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

export default function Nav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 flex z-50">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = path === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs transition-colors ${
              active ? "text-green-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
