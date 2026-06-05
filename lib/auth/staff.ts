export type BtfStaffRole = 'admin' | 'agent'

export function isBtfStaffRole(role: string | null | undefined): role is BtfStaffRole {
  return role === 'admin' || role === 'agent'
}
