import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchHostingContract } from '@/app/actions/hosting-maintenance'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HostingContractActions } from '@/components/ops/HostingContractActions'
import { HostingContractForm } from '@/components/ops/HostingContractForm'
import {
  formatHostingContractCost,
  formatHostingDate,
  isExpiringSoon,
} from '@/lib/ops/hosting-maintenance/display'
import { HOSTING_CONTRACT_STATUS_LABELS } from '@/lib/ops/hosting-maintenance/types'
import { requireStaff } from '@/lib/auth/require-staff'
import { createClient } from '@/lib/supabase/server'

export default async function HostingContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff()
  const { id } = await params
  const [contract, supabase] = await Promise.all([
    fetchHostingContract(id),
    createClient(),
  ])

  if (!contract) notFound()

  const { data: clients } = await supabase.from('clients').select('id, name').order('name')
  const expiring = isExpiringSoon(contract.periodEnd, contract.status)

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <Link href="/admin/ops/hosting-maintenance" className="dash-back">
        ← Back to hosting
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={contract.name}
          description={`${contract.clientName} · ${formatHostingContractCost(contract.costAmount, contract.periodType, contract.customPeriod)} · ${HOSTING_CONTRACT_STATUS_LABELS[contract.status]}`}
        />
        <HostingContractActions
          contractId={contract.id}
          contractName={contract.name}
          status={contract.status}
        />
      </div>

      {expiring ? (
        <p className="ops-hosting-banner">
          Expires on <strong>{formatHostingDate(contract.periodEnd)}</strong>
          {contract.renewalNotifiedAt
            ? ' — renewal reminder already sent'
            : ' — due for renewal reminder'}
        </p>
      ) : null}

      <HostingContractForm clients={clients ?? []} contract={contract} />
    </div>
  )
}
