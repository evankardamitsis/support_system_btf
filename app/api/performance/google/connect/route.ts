import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  GOOGLE_ADS_SCOPE,
  GOOGLE_OAUTH_COOKIE,
  createGoogleOAuthState,
  getGoogleOAuthConfig,
  googleCallbackUrl,
  normalizeGoogleCustomerId,
} from '@/lib/performance/google-oauth'

function integrationsUrl(request: NextRequest, accountId: string, message: string) {
  const url = new URL('/admin/performance/integrations', request.url)
  if (accountId) url.searchParams.set('account', accountId)
  url.searchParams.set('google', 'error')
  url.searchParams.set('googleMessage', message)
  return url
}

export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin()
  const accountId = request.nextUrl.searchParams.get('accountId')?.trim() || ''
  if (!isAdmin) return NextResponse.redirect(new URL('/auth/login', request.url))

  try {
    const customerId = normalizeGoogleCustomerId(
      request.nextUrl.searchParams.get('customerId') || ''
    )
    const loginCustomerId = normalizeGoogleCustomerId(
      request.nextUrl.searchParams.get('loginCustomerId') || '',
      false
    )
    const { clientId } = getGoogleOAuthConfig()
    const { data: account, error } = await supabase
      .from('performance_accounts')
      .select('id')
      .eq('id', accountId)
      .single()
    if (error || !account) throw new Error('Performance workspace not found')

    const { state, nonce } = createGoogleOAuthState(account.id, customerId, loginCustomerId)
    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authorizationUrl.searchParams.set('client_id', clientId)
    authorizationUrl.searchParams.set('redirect_uri', googleCallbackUrl(request.nextUrl.origin))
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('scope', GOOGLE_ADS_SCOPE)
    authorizationUrl.searchParams.set('access_type', 'offline')
    authorizationUrl.searchParams.set('prompt', 'consent')
    authorizationUrl.searchParams.set('include_granted_scopes', 'true')
    authorizationUrl.searchParams.set('state', state)

    const response = NextResponse.redirect(authorizationUrl)
    response.cookies.set(GOOGLE_OAUTH_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/performance/google/callback',
      maxAge: 10 * 60,
    })
    return response
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not start Google authorization'
    return NextResponse.redirect(integrationsUrl(request, accountId, message))
  }
}
