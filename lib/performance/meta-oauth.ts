import 'server-only'

import {
  createSignedOAuthState,
  performanceOAuthCallbackUrl,
  verifySignedOAuthState,
} from './oauth-state'

export const META_OAUTH_COOKIE = 'btf_meta_oauth_nonce'
export const DEFAULT_META_SCOPES = ['ads_read'] as const

type MetaOAuthState = {
  accountId: string
  adAccountId: string
}

export function normalizeMetaAdAccountId(value: string) {
  const id = value.trim().replace(/^act_/, '').replace(/[^0-9]/g, '')
  if (!id) throw new Error('Enter a valid Meta ad account ID')
  return id
}

export function getMetaOAuthConfig() {
  const appId = process.env.META_APP_ID?.trim()
  const appSecret = process.env.META_APP_SECRET?.trim()
  if (!appId || !appSecret) throw new Error('META_APP_ID and META_APP_SECRET are not configured')
  const scopes = (process.env.META_SCOPES || DEFAULT_META_SCOPES.join(','))
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean)
  return {
    appId,
    appSecret,
    scopes: [...new Set(scopes)],
    graphVersion: process.env.META_GRAPH_VERSION?.trim() || 'v26.0',
  }
}

export function isMetaOAuthConfigured() {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim())
}

export function createMetaOAuthState(accountId: string, adAccountId: string) {
  const { appSecret } = getMetaOAuthConfig()
  return createSignedOAuthState<MetaOAuthState>({ accountId, adAccountId }, appSecret)
}

export function verifyMetaOAuthState(state: string) {
  const { appSecret } = getMetaOAuthConfig()
  const payload = verifySignedOAuthState<MetaOAuthState>(state, appSecret, 'Meta')
  if (!payload.accountId || !payload.adAccountId) {
    throw new Error('The Meta authorization session is incomplete. Please try again.')
  }
  return payload
}

export function metaCallbackUrl(origin: string) {
  return performanceOAuthCallbackUrl('/api/performance/meta/callback', origin)
}
