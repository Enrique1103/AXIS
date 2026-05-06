"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  left: `${20 + Math.sin(i * 1.8) * 35 + 30}%`,
  animationDelay: `${1.2 + i * 0.12}s`,
  animationDuration: `${0.9 + (i % 4) * 0.3}s`,
  size: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
  dx: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 8)}px`,
}))

const FLAMES = [
  { width: "28%", height: "55%", left: "36%", delay: "0.3s", dur: "1.4s" },
  { width: "20%", height: "45%", left: "22%", delay: "0.5s", dur: "1.6s" },
  { width: "20%", height: "45%", left: "58%", delay: "0.4s", dur: "1.5s" },
  { width: "14%", height: "35%", left: "12%", delay: "0.7s", dur: "1.8s" },
  { width: "14%", height: "35%", left: "74%", delay: "0.6s", dur: "1.7s" },
]

export default function LoginPage() {
  const [mode, setMode]         = useState<"login" | "signup">("login")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError("Correo o contraseña incorrectos")
        setLoading(false)
      } else {
        router.push("/")
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSuccess("Cuenta creada. Revisa tu correo para confirmarla.")
        setLoading(false)
      }
    }
  }

  function toggleMode() {
    setMode(m => m === "login" ? "signup" : "login")
    setError("")
    setSuccess("")
  }

  return (
    <>
      <style>{`
        @keyframes phoenixRise {
          0%   { filter: grayscale(1) brightness(0.15); transform: translateY(48px) scale(0.82); opacity: 0; }
          30%  { opacity: 0.6; }
          100% { filter: grayscale(0) brightness(1); transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes flameRise {
          0%   { transform: scaleY(0) translateY(20px); opacity: 0; }
          40%  { opacity: 0.85; }
          100% { transform: scaleY(1) translateY(0); opacity: 0; }
        }
        @keyframes sparkFloat {
          0%   { opacity: 1; transform: translateY(0) translateX(0) scale(1); }
          100% { opacity: 0; transform: translateY(-90px) translateX(var(--dx)) scale(0.2); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.30; transform: scale(1.1); }
        }
        @keyframes textEmerge {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes formEmerge {
          0%   { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ashDrift {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.5; }
          100% { transform: translateY(-30px) translateX(10px) rotate(45deg); opacity: 0; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020817] px-6 py-12"
        style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(251,146,60,0.07) 0%, #020817 65%)" }}>

        {/* ── Animation ── */}
        <div className="relative w-56 h-60 md:w-64 md:h-68 flex items-center justify-center mb-2 select-none">

          {/* Glow */}
          <div className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(251,146,60,0.22) 0%, transparent 70%)",
              animation: "glowPulse 2.5s ease-in-out 1s infinite",
            }} />

          {/* Ash particles */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-zinc-500/40"
              style={{
                width: 3, height: 3,
                bottom: "10%",
                left: `${25 + i * 10}%`,
                animation: `ashDrift ${1.2 + i * 0.2}s ease-out ${i * 0.15}s both`,
              }} />
          ))}

          {/* Flames */}
          {FLAMES.map((f, i) => (
            <div key={i} className="absolute bottom-0 rounded-t-full"
              style={{
                width: f.width,
                height: f.height,
                left: f.left,
                background: "linear-gradient(to top, #dc2626, #f97316, #fbbf24)",
                animation: `flameRise ${f.dur} ease-out ${f.delay} both`,
                transformOrigin: "bottom center",
                filter: "blur(2px)",
              }} />
          ))}

          {/* Phoenix */}
          <div className="relative z-10 w-full h-full"
            style={{ animation: "phoenixRise 2.2s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}>
            <Image src="/fenix-icon.png" alt="FÉNIX" fill className="object-contain" priority />
          </div>

          {/* Sparks */}
          {SPARKS.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-amber-400 z-20"
              style={{
                width: s.size, height: s.size,
                bottom: "18%",
                left: s.left,
                "--dx": s.dx,
                animation: `sparkFloat ${s.animationDuration} ease-out ${s.animationDelay} both`,
              } as React.CSSProperties} />
          ))}
        </div>

        {/* ── Titles ── */}
        <h1 className="text-5xl font-black tracking-widest text-amber-400 mt-4"
          style={{ animation: "textEmerge 0.7s ease-out 2.4s both", fontFamily: "var(--font-serif)" }}>
          FÉNIX
        </h1>
        <p className="text-amber-200/65 text-sm italic mt-2 text-center max-w-xs"
          style={{
            animation: "textEmerge 0.7s ease-out 3s both",
            fontFamily: "var(--font-serif)",
          }}>
          &ldquo;Lo fácil nunca hizo historia&rdquo;
        </p>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}
          className="w-full max-w-sm mt-10 space-y-4"
          style={{ animation: "formEmerge 0.7s ease-out 3.5s both" }}>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 text-zinc-100
                placeholder:text-zinc-500 text-sm focus:outline-none focus:border-amber-500/60
                focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 text-zinc-100
                placeholder:text-zinc-500 text-sm focus:outline-none focus:border-amber-500/60
                focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>

          {error   && <p className="text-red-400 text-xs text-center">{error}</p>}
          {success && <p className="text-green-400 text-xs text-center">{success}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-widest transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "rgba(251,146,60,0.3)"
                : "linear-gradient(135deg, #f97316, #dc2626)",
              color: "#fff",
              boxShadow: loading ? "none" : "0 0 24px rgba(249,115,22,0.35)",
            }}>
            {loading
              ? (mode === "login" ? "Resurgiendo…" : "Creando cuenta…")
              : (mode === "login" ? "Resurgir" : "Crear cuenta")}
          </button>

          <p className="text-center text-xs text-zinc-500">
            {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}
            {" "}
            <button type="button" onClick={toggleMode}
              className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
              {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </p>
        </form>
      </div>
    </>
  )
}
