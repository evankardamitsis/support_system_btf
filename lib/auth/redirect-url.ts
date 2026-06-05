export function getAuthRedirectOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/** Supabase password reset email → exchange code → set new password */
export function getPasswordRecoveryRedirectTo(): string {
  return `${getAuthRedirectOrigin()}/auth/callback?type=recovery`
}

/** Client signup confirmation email → session → portal */
export function getSignupEmailRedirectTo(): string {
  return `${getAuthRedirectOrigin()}/auth/callback`
}
