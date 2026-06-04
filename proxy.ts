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
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Root redirect based on role
  if (pathname === '/') {
    if (role === 'client') {
      return NextResponse.redirect(new URL('/portal/tickets', request.url))
    }
    if (role === 'admin' || role === 'agent') {
      return NextResponse.redirect(new URL('/admin/tickets', request.url))
    }
  }

  // Clients cannot access /admin
  if (pathname.startsWith('/admin') && role === 'client') {
    return NextResponse.redirect(new URL('/portal/tickets', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
