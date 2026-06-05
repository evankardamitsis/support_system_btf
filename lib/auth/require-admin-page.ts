import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function requireAdminPage() {
  const result = await requireAdmin()
  if (!result.isAdmin || !result.user) redirect('/admin/tickets')
  return result
}
