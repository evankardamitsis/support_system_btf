import Link from 'next/link'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FinancialOfferForm } from '@/components/ops/FinancialOfferForm'
import { requireStaff } from '@/lib/auth/require-staff'
import { getCompanyProfileForOffers } from '@/lib/ops/company-profile'
import { createClient } from '@/lib/supabase/server'

export default async function NewFinancialOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  await requireStaff()
  const { client: clientParam } = await searchParams
  const supabase = await createClient()
  const [{ profile, ibans }, { data: clients }] = await Promise.all([
    getCompanyProfileForOffers(supabase),
    supabase.from('clients').select('id, name, email').order('name'),
  ])
  const clientRows = clients ?? []
  const initialClientId =
    clientParam && clientRows.some(row => row.id === clientParam) ? clientParam : undefined

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <Link href="/admin/ops/financial-offers" className="dash-back">
        ← Back to offers
      </Link>

      <PageHeader
        title="New financial offer"
        description={`Build a client offer — totals and ${profile.upfrontPercent}% upfront are calculated automatically.`}
      />

      <FinancialOfferForm
        savedIbans={ibans}
        upfrontPercent={profile.upfrontPercent}
        clients={clientRows}
        initialClientId={initialClientId}
      />
    </div>
  )
}
