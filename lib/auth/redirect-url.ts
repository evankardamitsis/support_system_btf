export function getAuthRedirectOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/** Supabase password reset email → verify token → set new password */
export function getPasswordRecoveryRedirectTo(): string {
  return `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`
}

/** Client signup confirmation email → session → portal */
export function getSignupEmailRedirectTo(): string {
  return `${getAuthRedirectOrigin()}/auth/callback`
}
