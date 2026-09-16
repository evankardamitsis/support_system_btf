import 'server-only'

import {
  createSignedOAuthState,
  performanceOAuthCallbackUrl,
  verifySignedOAuthState,
} from './oauth-state'

export const GOOGLE_OAUTH_COOKIE = 'btf_google_oauth_nonce'
export const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords'

type GoogleOAuthState = {
  accountId: string
  customerId: string
  loginCustomerId: string
}

export function normalizeGoogleCustomerId(value: string, required = true) {
  const id = value.trim().replace(/[^0-9]/g, '')
  if (required && !id) throw new Error('Enter a valid Google Ads customer ID')
  return id
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET are not configured')
  }
  return {
    clientId,
    clientSecret,
    apiVersion: process.env.GOOGLE_ADS_API_VERSION?.trim() || 'v25',
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || undefined,
  }
}

export function isGoogleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID?.trim() && process.env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  )
}

export function createGoogleOAuthState(
  accountId: string,
  customerId: string,
  loginCustomerId: string
) {
  const { clientSecret } = getGoogleOAuthConfig()
  return createSignedOAuthState<GoogleOAuthState>(
    { accountId, customerId, loginCustomerId },
    clientSecret
  )
}

export function verifyGoogleOAuthState(state: string) {
  const { clientSecret } = getGoogleOAuthConfig()
  const payload = verifySignedOAuthState<GoogleOAuthState>(state, clientSecret, 'Google Ads')
  if (!payload.accountId || !payload.customerId) {
    throw new Error('The Google Ads authorization session is incomplete. Please try again.')
  }
  return payload
}

export function googleCallbackUrl(origin: string) {
  return performanceOAuthCallbackUrl('/api/performance/google/callback', origin)
}
