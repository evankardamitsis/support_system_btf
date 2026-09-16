export type PerformanceAccessResult =
  | {
      ok: true
      url: string
      emailSent: boolean
      emailError: string | null
      existingUser: boolean
    }
  | { ok: false; error: string }

export type PerformanceAccessDirectory = {
  setupRequired: boolean
  viewers: Array<{
    id: string
    fullName: string | null
    email: string
    createdAt: string
  }>
  pendingInvites: Array<{
    id: string
    fullName: string
    email: string
    expiresAt: string
  }>
}
