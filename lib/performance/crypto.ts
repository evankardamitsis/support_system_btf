import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { ProviderCredentials } from './types'

const VERSION = 'v1'

function getKey() {
  const secret = process.env.PERFORMANCE_CREDENTIALS_KEY
  if (!secret || secret.length < 32) {
    throw new Error('PERFORMANCE_CREDENTIALS_KEY must be configured with at least 32 random characters')
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptPerformanceCredentials(credentials: ProviderCredentials): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptPerformanceCredentials(value: string): ProviderCredentials {
  const [version, ivValue, tagValue, encryptedValue] = value.split('.')
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Stored performance credentials are invalid')
  }

  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ])
  return JSON.parse(decrypted.toString('utf8')) as ProviderCredentials
}

