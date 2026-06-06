import { OpsDashboard } from '@/components/ops/OpsDashboard'
import { getOpsDashboard } from '@/lib/ops/dashboard/service'
import { requireStaff } from '@/lib/auth/require-staff'

export default async function AdminOpsPage() {
  const { supabase, profile } = await requireStaff()
  const isAdmin = profile.role === 'admin'
  const data = await getOpsDashboard(supabase, { includeProjects: isAdmin })

  return <OpsDashboard data={data} isAdmin={isAdmin} />
}
