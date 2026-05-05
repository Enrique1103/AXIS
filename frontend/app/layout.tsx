import type { Metadata, Viewport } from "next"
import { Inter, Lora } from "next/font/google"
import "./globals.css"
import TopNav from "@/components/top-nav"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "AXIS",
  description: "Fortiter et Fideliter · Amor Fati",
  icons: { icon: "/axis-icon.png", apple: "/axis-icon.png" },
}

export const viewport: Viewport = {
  themeColor: "#020817",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){var t=localStorage.getItem('axis-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})()`
        }}/>
      </head>
      <body className={`${inter.className} ${lora.variable} min-h-screen`}>
        <TopNav />
        <main className="pt-[128px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
