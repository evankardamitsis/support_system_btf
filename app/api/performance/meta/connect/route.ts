import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  META_OAUTH_COOKIE,
  createMetaOAuthState,
  getMetaOAuthConfig,
  metaCallbackUrl,
  normalizeMetaAdAccountId,
} from '@/lib/performance/meta-oauth'

function integrationsUrl(request: NextRequest, accountId: string, message: string) {
  const url = new URL('/admin/performance/integrations', request.url)
  if (accountId) url.searchParams.set('account', accountId)
  url.searchParams.set('meta', 'error')
  url.searchParams.set('metaMessage', message)
  return url
}

export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin()
  const accountId = request.nextUrl.searchParams.get('accountId')?.trim() || ''
  if (!isAdmin) return NextResponse.redirect(new URL('/auth/login', request.url))

  try {
    const adAccountId = normalizeMetaAdAccountId(
      request.nextUrl.searchParams.get('adAccountId') || ''
    )
    const { appId, scopes, graphVersion } = getMetaOAuthConfig()
    const { data: account, error } = await supabase
      .from('performance_accounts')
      .select('id')
      .eq('id', accountId)
      .single()
    if (error || !account) throw new Error('Performance workspace not found')

    const { state, nonce } = createMetaOAuthState(account.id, adAccountId)
    const authorizationUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
    authorizationUrl.searchParams.set('client_id', appId)
    authorizationUrl.searchParams.set('redirect_uri', metaCallbackUrl(request.nextUrl.origin))
    authorizationUrl.searchParams.set('state', state)
    authorizationUrl.searchParams.set('scope', scopes.join(','))
    authorizationUrl.searchParams.set('response_type', 'code')

    const response = NextResponse.redirect(authorizationUrl)
    response.cookies.set(META_OAUTH_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/performance/meta/callback',
      maxAge: 10 * 60,
    })
    return response
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not start Meta authorization'
    return NextResponse.redirect(integrationsUrl(request, accountId, message))
  }
}
