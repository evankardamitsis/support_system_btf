import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { encryptPerformanceCredentials } from '@/lib/performance/crypto'
import {
  GOOGLE_OAUTH_COOKIE,
  getGoogleOAuthConfig,
  googleCallbackUrl,
  verifyGoogleOAuthState,
} from '@/lib/performance/google-oauth'
import { testProviderConnection } from '@/lib/performance/providerAdapters'
import { syncPerformanceAccount } from '@/lib/performance/service'
import type { GoogleCredentials } from '@/lib/performance/types'

type GoogleTokenResponse = {
  refresh_token?: string
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
  url.searchParams.set('google', status)
  url.searchParams.set('googleMessage', message)
  return url
}

function finish(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/performance/google/callback',
    maxAge: 0,
  })
  return response
}

export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return NextResponse.redirect(new URL('/auth/login', request.url))

  let accountId = ''
  try {
    const callbackError = request.nextUrl.searchParams.get('error_description')
      || request.nextUrl.searchParams.get('error')
    if (callbackError) throw new Error(callbackError)

    const state = verifyGoogleOAuthState(request.nextUrl.searchParams.get('state') || '')
    accountId = state.accountId
    if (request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value !== state.nonce) {
      throw new Error('The Google Ads authorization session could not be verified. Please try again.')
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) throw new Error('Google did not return an authorization code')
    const { clientId, clientSecret, apiVersion, developerToken } = getGoogleOAuthConfig()
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleCallbackUrl(request.nextUrl.origin),
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    })
    const token = (await response.json().catch(() => ({}))) as GoogleTokenResponse
    if (!response.ok || !token.refresh_token) {
      throw new Error(
        token.error_description
          || token.error
          || 'Google did not issue an offline refresh token. Reauthorize and approve consent.'
      )
    }

    const credentials: GoogleCredentials = {
      customerId: state.customerId,
      loginCustomerId: state.loginCustomerId || undefined,
      developerToken,
      clientId,
      clientSecret,
      refreshToken: token.refresh_token,
      apiVersion,
    }
    await testProviderConnection('google', credentials)

    const { error } = await supabase.from('performance_connections').upsert(
      {
        account_id: accountId,
        provider: 'google',
        status: 'connected',
        label: 'Google Ads',
        external_account_id: state.customerId,
        credentials_encrypted: encryptPerformanceCredentials(credentials),
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,provider' }
    )
    if (error) throw new Error(error.message)

    const results = await syncPerformanceAccount(accountId)
    const result = results.find(item => item.provider === 'google')
    revalidatePath('/admin/performance')
    revalidatePath('/admin/performance/integrations')
    const message = result?.ok
      ? `Google Ads connected and ${result.rows} daily metric row${result.rows === 1 ? '' : 's'} synced.`
      : `Google Ads connected, but the first sync needs attention: ${result?.error || 'No sync result returned'}`
    return finish(NextResponse.redirect(integrationsUrl(request, accountId, 'connected', message)))
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not finish Google authorization'
    return finish(NextResponse.redirect(integrationsUrl(request, accountId, 'error', message)))
  }
}
