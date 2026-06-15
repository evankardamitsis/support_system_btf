export function getAuthRedirectOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/** Password reset link → /auth/callback → verifyOtp → /auth/update-password */
export function buildPasswordRecoveryCallbackUrl(tokenHash: string): string {
  const origin = getAuthRedirectOrigin()
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: 'recovery',
    next: '/auth/update-password',
  })
  return `${origin}/auth/callback?${params.toString()}`
}

/** Supabase password reset email → verify token → set new password */
export function getPasswordRecoveryRedirectTo(): string {
  return `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`
}

/** Client signup confirmation email → session → portal */
export function getSignupEmailRedirectTo(): string {
  return `${getAuthRedirectOrigin()}/auth/callback`
}
