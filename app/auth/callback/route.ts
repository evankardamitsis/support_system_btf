import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { finalizeRegistration } from '@/lib/auth/finalize-registration'
import { getPostLoginPath } from '@/lib/auth/post-login'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

function loginErrorRedirect(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/auth/login?error=${encodeURIComponent(message)}`, request.url)
  )
}

function isRecoveryFlow(type: string | null, next: string | null): boolean {
  return type === 'recovery' || next === '/auth/update-password'
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  if (!tokenHash && !code) {
    const confirmUrl = new URL('/auth/confirm', request.url)
    confirmUrl.search = requestUrl.search
    confirmUrl.hash = requestUrl.hash
    return NextResponse.redirect(confirmUrl)
  }

  const { supabase, redirectWithCookies } = createRouteHandlerClient(request)

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    })

    if (error) {
      return loginErrorRedirect(request, 'Link expired or invalid. Request a new one.')
    }

    if (isRecoveryFlow(type, next)) {
      return redirectWithCookies('/auth/update-password')
    }

    await finalizeRegistration(supabase)
    const path = await getPostLoginPath(supabase)
    return redirectWithCookies(path)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return loginErrorRedirect(request, 'Link expired or invalid. Request a new one.')
    }

    if (isRecoveryFlow(type, next)) {
      return redirectWithCookies('/auth/update-password')
    }

    await finalizeRegistration(supabase)
    const path = await getPostLoginPath(supabase)
    return redirectWithCookies(path)
  }

  return loginErrorRedirect(request, 'Link expired or invalid. Request a new one.')
}
