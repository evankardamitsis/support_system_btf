export const STAFF_ROLES = ['admin', 'agent'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  agent: 'Member',
}

export function formatStaffRole(role: string): string {
  if (role === 'admin' || role === 'agent') return ROLE_LABELS[role]
  return role
}

export function parseStaffRole(raw: string | null): StaffRole {
  return raw === 'admin' ? 'admin' : 'agent'
}
