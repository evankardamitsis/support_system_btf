import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SHOPIFY_OAUTH_COOKIE = 'btf_shopify_oauth_nonce'
export const DEFAULT_SHOPIFY_SCOPES = ['read_orders', 'read_customers', 'read_products', 'read_reports'] as const

type ShopifyOAuthState = {
  accountId: string
  shop: string
  nonce: string
  expiresAt: number
}

function shopifyClientSecret() {
  const secret = process.env.SHOPIFY_CLIENT_SECRET?.trim()
  if (!secret) throw new Error('SHOPIFY_CLIENT_SECRET is not configured')
  return secret
}

function signature(value: string) {
  return createHmac('sha256', shopifyClientSecret()).update(value).digest('base64url')
}

function equal(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function normalizeShopifyDomain(value: string) {
  const shop = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new Error('Use the permanent Shopify domain, for example store.myshopify.com')
  }
  return shop
}

export function getShopifyOAuthConfig() {
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim()
  if (!clientId) throw new Error('SHOPIFY_CLIENT_ID is not configured')

  const scopes = (process.env.SHOPIFY_SCOPES || DEFAULT_SHOPIFY_SCOPES.join(','))
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean)

  return {
    clientId,
    clientSecret: shopifyClientSecret(),
    scopes: [...new Set(scopes)],
    apiVersion: process.env.SHOPIFY_API_VERSION?.trim() || '2026-07',
  }
}

export function isShopifyOAuthConfigured() {
  return Boolean(process.env.SHOPIFY_CLIENT_ID?.trim() && process.env.SHOPIFY_CLIENT_SECRET?.trim())
}

export function createShopifyOAuthState(accountId: string, shop: string) {
  const payload: ShopifyOAuthState = {
    accountId,
    shop,
    nonce: randomBytes(24).toString('base64url'),
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return { state: `${encoded}.${signature(encoded)}`, nonce: payload.nonce }
}

export function verifyShopifyOAuthState(state: string): ShopifyOAuthState {
  const [encoded, receivedSignature] = state.split('.')
  if (!encoded || !receivedSignature || !equal(signature(encoded), receivedSignature)) {
    throw new Error('The Shopify authorization state is invalid. Please try again.')
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ShopifyOAuthState
  if (!payload.accountId || !payload.shop || !payload.nonce || payload.expiresAt < Date.now()) {
    throw new Error('The Shopify authorization session expired. Please try again.')
  }
  return payload
}

export function verifyShopifyCallbackHmac(searchParams: URLSearchParams) {
  const receivedHmac = searchParams.get('hmac') || ''
  const message = [...searchParams.entries()]
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const expectedHmac = createHmac('sha256', shopifyClientSecret()).update(message).digest('hex')
  if (!receivedHmac || !equal(expectedHmac, receivedHmac)) {
    throw new Error('Shopify callback verification failed.')
  }
}

export function shopifyCallbackUrl(origin: string) {
  const configuredOrigin = process.env.NODE_ENV === 'development'
    ? origin
    : process.env.NEXT_PUBLIC_APP_URL?.trim() || origin
  return new URL('/api/performance/shopify/callback', configuredOrigin).toString()
}
