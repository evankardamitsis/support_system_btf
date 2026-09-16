import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

type OAuthStateBase = {
  nonce: string
  expiresAt: number
}

function equal(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function signature(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createSignedOAuthState<T extends Record<string, string>>(payload: T, secret: string) {
  const statePayload: T & OAuthStateBase = {
    ...payload,
    nonce: randomBytes(24).toString('base64url'),
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(statePayload)).toString('base64url')
  return {
    state: `${encoded}.${signature(encoded, secret)}`,
    nonce: statePayload.nonce,
  }
}

export function verifySignedOAuthState<T extends Record<string, string>>(
  state: string,
  secret: string,
  provider: string
) {
  const [encoded, receivedSignature] = state.split('.')
  if (!encoded || !receivedSignature || !equal(signature(encoded, secret), receivedSignature)) {
    throw new Error(`The ${provider} authorization state is invalid. Please try again.`)
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T & OAuthStateBase
  if (!payload.nonce || payload.expiresAt < Date.now()) {
    throw new Error(`The ${provider} authorization session expired. Please try again.`)
  }
  return payload
}

export function performanceOAuthCallbackUrl(path: string, requestOrigin: string) {
  const origin = process.env.NODE_ENV === 'development'
    ? requestOrigin
    : process.env.NEXT_PUBLIC_APP_URL?.trim() || requestOrigin
  return new URL(path, origin).toString()
}
