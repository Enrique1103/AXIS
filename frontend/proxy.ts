import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          ),
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  } catch {
    // Si falla el check de sesión, dejamos pasar para evitar pantalla en blanco
  }

  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.json|.*\\.js|.*\\.ico).*)",
  ],
}
