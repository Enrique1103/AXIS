"use client"

import { usePathname } from "next/navigation"
import { AuthProvider } from "@/context/auth-context"
import TopNav from "@/components/top-nav"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/login"

  return (
    <AuthProvider>
      {!isLogin && <TopNav />}
      <main className={isLogin ? "min-h-screen" : "pt-[128px] min-h-screen"}>
        {children}
      </main>
    </AuthProvider>
  )
}
