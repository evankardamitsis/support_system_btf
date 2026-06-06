import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HostingContractForm } from '@/components/ops/HostingContractForm'
import { requireStaff } from '@/lib/auth/require-staff'

export default async function NewHostingContractPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  await requireStaff()
  const { client: clientParam } = await searchParams
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')
  const clientRows = clients ?? []
  const initialClientId =
    clientParam && clientRows.some(row => row.id === clientParam) ? clientParam : undefined

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <Link href="/admin/ops/hosting-maintenance" className="dash-back">
        ← Back to hosting
      </Link>

      <PageHeader
        title="New hosting contract"
        description="Set the billing period and expiry — reminders go out 14 days before the end date."
      />

      <HostingContractForm clients={clientRows} initialClientId={initialClientId} />
    </div>
  )
}
