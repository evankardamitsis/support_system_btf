import Link from 'next/link'
import { PerformanceHQ } from '@/components/performance/PerformanceHQ'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { requireStaff } from '@/lib/auth/require-staff'
import { getSashaPerformancePreview } from '@/lib/performance/demo'
import { getPerformanceDashboard } from '@/lib/performance/service'

export default async function AdminPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; range?: string; preview?: string }>
}) {
  const { account, range, preview } = await searchParams
  const { supabase } = await requireStaff()
  const rangeDays = Number(range || 30)

  if (process.env.NODE_ENV === 'development' && preview === '1') {
    return <PerformanceHQ data={getSashaPerformancePreview(rangeDays)} />
  }

  let data: Awaited<ReturnType<typeof getPerformanceDashboard>> | null = null
  let loadError: string | null = null
  try {
    data = await getPerformanceDashboard(supabase, {
      accountId: account,
      rangeDays,
    })
  } catch (cause) {
    loadError = cause instanceof Error ? cause.message : 'Performance data is unavailable'
  }

  if (data) return <PerformanceHQ data={data} />

  return (
    <div className="performance-layout">
      <PageHeader title="Performance Retainers" description="The performance data layer is not ready yet." />
      <div className="performance-empty-account">
        <h2>Database setup required</h2>
        <p>{loadError}</p>
        <Link href="/admin/performance/integrations" className="performance-primary-link">Open setup</Link>
      </div>
    </div>
  )
}
