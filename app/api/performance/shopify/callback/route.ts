import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { encryptPerformanceCredentials } from '@/lib/performance/crypto'
import { testProviderConnection } from '@/lib/performance/providerAdapters'
import { syncPerformanceAccount } from '@/lib/performance/service'
import {
  SHOPIFY_OAUTH_COOKIE,
  getShopifyOAuthConfig,
  normalizeShopifyDomain,
  verifyShopifyCallbackHmac,
  verifyShopifyOAuthState,
} from '@/lib/performance/shopify-oauth'
import type { ShopifyCredentials } from '@/lib/performance/types'

type ShopifyTokenResponse = {
  access_token?: string
  scope?: string
  error?: string
  error_description?: string
}

function integrationsUrl(
  request: NextRequest,
  accountId: string,
  status: 'connected' | 'error',
  message: string
) {
  const url = new URL('/admin/performance/integrations', request.url)
  if (accountId) url.searchParams.set('account', accountId)
  url.searchParams.set('shopify', status)
  url.searchParams.set('shopifyMessage', message)
  return url
}

function finish(response: NextResponse) {
  response.cookies.set(SHOPIFY_OAUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/performance/shopify/callback',
    maxAge: 0,
  })
  return response
}

export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return NextResponse.redirect(new URL('/auth/login', request.url))

  let accountId = ''
  try {
    verifyShopifyCallbackHmac(request.nextUrl.searchParams)
    const state = verifyShopifyOAuthState(request.nextUrl.searchParams.get('state') || '')
    accountId = state.accountId
    const shop = normalizeShopifyDomain(request.nextUrl.searchParams.get('shop') || '')
    if (shop !== state.shop || request.cookies.get(SHOPIFY_OAUTH_COOKIE)?.value !== state.nonce) {
      throw new Error('The Shopify authorization session could not be verified. Please try again.')
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) throw new Error('Shopify did not return an authorization code')
    const { clientId, clientSecret, apiVersion } = getShopifyOAuthConfig()
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      cache: 'no-store',
    })
    const token = (await tokenResponse.json().catch(() => ({}))) as ShopifyTokenResponse
    if (!tokenResponse.ok || !token.access_token) {
      throw new Error(token.error_description || token.error || 'Shopify did not issue an access token')
    }

    const credentials: ShopifyCredentials = {
      shop,
      accessToken: token.access_token,
      apiVersion,
      scopes: (token.scope || '').split(',').filter(Boolean),
    }
    await testProviderConnection('shopify', credentials)

    const now = new Date().toISOString()
    const { error } = await supabase.from('performance_connections').upsert(
      {
        account_id: accountId,
        provider: 'shopify',
        status: 'connected',
        label: 'Shopify',
        external_account_id: shop,
        credentials_encrypted: encryptPerformanceCredentials(credentials),
        last_error: null,
        updated_at: now,
      },
      { onConflict: 'account_id,provider' }
    )
    if (error) throw new Error(error.message)

    const [result] = await syncPerformanceAccount(accountId)
    revalidatePath('/admin/performance')
    revalidatePath('/admin/performance/integrations')
    const message = result?.ok
      ? `Shopify connected and ${result.rows} daily metric row${result.rows === 1 ? '' : 's'} synced.`
      : `Shopify connected, but the first sync needs attention: ${result?.error || 'No sync result returned'}`
    return finish(NextResponse.redirect(integrationsUrl(request, accountId, 'connected', message)))
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not finish Shopify authorization'
    return finish(NextResponse.redirect(integrationsUrl(request, accountId, 'error', message)))
  }
}
