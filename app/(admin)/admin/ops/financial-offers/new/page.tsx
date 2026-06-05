import Link from 'next/link'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FinancialOfferForm } from '@/components/ops/FinancialOfferForm'
import { requireStaff } from '@/lib/auth/require-staff'
import { getCompanyProfileForOffers } from '@/lib/ops/company-profile'
import { createClient } from '@/lib/supabase/server'

export default async function NewFinancialOfferPage() {
  await requireStaff()
  const supabase = await createClient()
  const { profile, ibans } = await getCompanyProfileForOffers(supabase)

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <Link href="/admin/ops/financial-offers" className="dash-back">
        ← Back to offers
      </Link>

      <PageHeader
        title="New financial offer"
        description={`Build a client offer — totals and ${profile.upfrontPercent}% upfront are calculated automatically.`}
      />

      <FinancialOfferForm savedIbans={ibans} upfrontPercent={profile.upfrontPercent} />
    </div>
  )
}
