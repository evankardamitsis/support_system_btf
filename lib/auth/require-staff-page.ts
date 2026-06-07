import { requireStaff } from '@/lib/auth/require-staff'

export async function requireStaffPage() {
  return requireStaff()
}
