import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (!user) {
    if (pathname.startsWith('/portal') || pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return supabaseResponse
  }

  // Fetch role for routing decisions
  const [{ data: profile }, { data: accessProfile }] = await Promise.all([
    supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle(),
    supabase
      .from('users')
      .select('portal_access_scope')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const role = profile?.role
  const performanceOnly = role === 'client' && accessProfile?.portal_access_scope === 'performance'

  // Root redirect based on role
  if (pathname === '/') {
    if (role === 'client') {
      return NextResponse.redirect(new URL(performanceOnly ? '/portal/performance' : '/portal/tickets', request.url))
    }
    if (role === 'admin' || role === 'agent') {
      return NextResponse.redirect(new URL('/admin/tickets', request.url))
    }
    // Signed in without a profile row — portal layout repairs client accounts
    if (user.email) {
      return NextResponse.redirect(new URL('/portal/tickets', request.url))
    }
  }

  // Clients cannot access /admin
  if (pathname.startsWith('/admin') && role === 'client') {
    return NextResponse.redirect(new URL(performanceOnly ? '/portal/performance' : '/portal/tickets', request.url))
  }

  if (
    performanceOnly
    && pathname.startsWith('/portal')
    && !pathname.startsWith('/portal/performance')
  ) {
    return NextResponse.redirect(new URL('/portal/performance', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
