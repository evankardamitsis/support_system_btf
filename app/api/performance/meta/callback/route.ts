import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { encryptPerformanceCredentials } from '@/lib/performance/crypto'
import {
  META_OAUTH_COOKIE,
  getMetaOAuthConfig,
  metaCallbackUrl,
  verifyMetaOAuthState,
} from '@/lib/performance/meta-oauth'
import { testProviderConnection } from '@/lib/performance/providerAdapters'
import { syncPerformanceAccount } from '@/lib/performance/service'
import type { MetaCredentials } from '@/lib/performance/types'

type MetaTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: { message?: string }
}

function integrationsUrl(
  request: NextRequest,
  accountId: string,
  status: 'connected' | 'error',
  message: string
) {
  const url = new URL('/admin/performance/integrations', request.url)
  if (accountId) url.searchParams.set('account', accountId)
  url.searchParams.set('meta', status)
  url.searchParams.set('metaMessage', message)
  return url
}

function finish(response: NextResponse) {
  response.cookies.set(META_OAUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/performance/meta/callback',
    maxAge: 0,
  })
  return response
}

async function metaToken(url: URL) {
  const response = await fetch(url, { cache: 'no-store' })
  const payload = (await response.json().catch(() => ({}))) as MetaTokenResponse
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error?.message || 'Meta did not issue an access token')
  }
  return payload
}

export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return NextResponse.redirect(new URL('/auth/login', request.url))

  let accountId = ''
  try {
    const callbackError = request.nextUrl.searchParams.get('error_description')
      || request.nextUrl.searchParams.get('error_message')
    if (callbackError) throw new Error(callbackError)

    const state = verifyMetaOAuthState(request.nextUrl.searchParams.get('state') || '')
    accountId = state.accountId
    if (request.cookies.get(META_OAUTH_COOKIE)?.value !== state.nonce) {
      throw new Error('The Meta authorization session could not be verified. Please try again.')
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) throw new Error('Meta did not return an authorization code')
    const { appId, appSecret, graphVersion } = getMetaOAuthConfig()
    const shortTokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
    shortTokenUrl.searchParams.set('client_id', appId)
    shortTokenUrl.searchParams.set('client_secret', appSecret)
    shortTokenUrl.searchParams.set('redirect_uri', metaCallbackUrl(request.nextUrl.origin))
    shortTokenUrl.searchParams.set('code', code)
    const shortToken = await metaToken(shortTokenUrl)

    const longTokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longTokenUrl.searchParams.set('client_id', appId)
    longTokenUrl.searchParams.set('client_secret', appSecret)
    longTokenUrl.searchParams.set('fb_exchange_token', shortToken.access_token!)
    const longToken = await metaToken(longTokenUrl)
    const credentials: MetaCredentials = {
      adAccountId: state.adAccountId,
      accessToken: longToken.access_token!,
      graphVersion,
      expiresAt: longToken.expires_in
        ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
        : undefined,
    }
    await testProviderConnection('meta', credentials)

    const { error } = await supabase.from('performance_connections').upsert(
      {
        account_id: accountId,
        provider: 'meta',
        status: 'connected',
        label: 'Meta Ads',
        external_account_id: state.adAccountId,
        credentials_encrypted: encryptPerformanceCredentials(credentials),
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,provider' }
    )
    if (error) throw new Error(error.message)

    const results = await syncPerformanceAccount(accountId)
    const result = results.find(item => item.provider === 'meta')
    revalidatePath('/admin/performance')
    revalidatePath('/admin/performance/integrations')
    const message = result?.ok
      ? `Meta Ads connected and ${result.rows} daily metric row${result.rows === 1 ? '' : 's'} synced.`
      : `Meta Ads connected, but the first sync needs attention: ${result?.error || 'No sync result returned'}`
    return finish(NextResponse.redirect(integrationsUrl(request, accountId, 'connected', message)))
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not finish Meta authorization'
    return finish(NextResponse.redirect(integrationsUrl(request, accountId, 'error', message)))
  }
}
