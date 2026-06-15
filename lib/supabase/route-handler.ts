import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '../database.types'

type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }

/** Supabase client for route handlers — collects auth cookies for the final response. */
export function createRouteHandlerClient(request: NextRequest) {
  const cookieJar: CookieToSet[] = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            const index = cookieJar.findIndex(entry => entry.name === cookie.name)
            if (index >= 0) cookieJar[index] = cookie
            else cookieJar.push(cookie)
          }
        },
      },
    }
  )

  function redirectWithCookies(path: string) {
    const response = NextResponse.redirect(new URL(path, request.url))
    cookieJar.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  return { supabase, redirectWithCookies }
}
