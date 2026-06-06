import Link from 'next/link'
import { fetchHostingContracts } from '@/app/actions/hosting-maintenance'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HostingContractsList } from '@/components/ops/HostingContractsList'
import { requireStaff } from '@/lib/auth/require-staff'

export default async function HostingMaintenancePage() {
  await requireStaff()
  const contracts = await fetchHostingContracts()

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Hosting & maintenance"
          description="Track hosting contracts, expiry dates, and send renewal reminders to clients."
        />
        <Link
          href="/admin/ops/hosting-maintenance/new"
          className="dash-btn-primary btn-primary shrink-0"
        >
          New contract
        </Link>
      </div>

      <HostingContractsList contracts={contracts} />
    </div>
  )
}
