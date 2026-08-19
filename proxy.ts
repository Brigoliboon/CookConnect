import { type NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { createClient } from "@/utils/supabase/middleware"
import { routing } from "@/i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

const AUTH_ROUTES = ["/login"]
const PROTECTED_PREFIXES = ["/employee", "/rider", "/customer"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { supabase, supabaseResponse } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/employee", request.url))
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  const response = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value)
  })
  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon|logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}