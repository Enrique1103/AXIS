import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  } catch {
    // Si falla el check de auth, dejamos pasar para evitar pantalla en blanco
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
  ],
}
