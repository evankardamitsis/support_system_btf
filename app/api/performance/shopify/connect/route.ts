import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  SHOPIFY_OAUTH_COOKIE,
  createShopifyOAuthState,
  getShopifyOAuthConfig,
  normalizeShopifyDomain,
  shopifyCallbackUrl,
} from '@/lib/performance/shopify-oauth'

function integrationsUrl(request: NextRequest, accountId: string, message: string) {
  const url = new URL('/admin/performance/integrations', request.url)
  if (accountId) url.searchParams.set('account', accountId)
  url.searchParams.set('shopify', 'error')
  url.searchParams.set('shopifyMessage', message)
  return url
}

export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin()
  const accountId = request.nextUrl.searchParams.get('accountId')?.trim() || ''
  if (!isAdmin) return NextResponse.redirect(new URL('/auth/login', request.url))

  try {
    const shop = normalizeShopifyDomain(request.nextUrl.searchParams.get('shop') || '')
    const { clientId, scopes } = getShopifyOAuthConfig()
    const { data: account, error } = await supabase
      .from('performance_accounts')
      .select('id')
      .eq('id', accountId)
      .single()
    if (error || !account) throw new Error('Performance workspace not found')

    const { state, nonce } = createShopifyOAuthState(account.id, shop)
    const authorizationUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authorizationUrl.searchParams.set('client_id', clientId)
    authorizationUrl.searchParams.set('scope', scopes.join(','))
    authorizationUrl.searchParams.set('redirect_uri', shopifyCallbackUrl(request.nextUrl.origin))
    authorizationUrl.searchParams.set('state', state)

    const response = NextResponse.redirect(authorizationUrl)
    response.cookies.set(SHOPIFY_OAUTH_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/performance/shopify/callback',
      maxAge: 10 * 60,
    })
    return response
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not start Shopify authorization'
    return NextResponse.redirect(integrationsUrl(request, accountId, message))
  }
}
