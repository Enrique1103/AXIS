import type { Metadata, Viewport } from "next"
import { Inter, Lora } from "next/font/google"
import "./globals.css"
import ClientLayout from "@/components/client-layout"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "FÉNIX",
  description: "Lo fácil nunca hizo historia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FÉNIX",
  },
  icons: {
    icon: [
      { url: "/fenix-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/fenix-icon.png",     sizes: "468x446", type: "image/png" },
    ],
    apple: "/fenix-icon-512.png",
  },
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
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){var t=localStorage.getItem('fenix-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})()`
        }}/>
        <script dangerouslySetInnerHTML={{ __html:
          `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`
        }}/>
      </head>
      <body className={`${inter.className} ${lora.variable} min-h-screen`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
