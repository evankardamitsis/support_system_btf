import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FinancialOfferForm } from '@/components/ops/FinancialOfferForm'
import { fetchFinancialOffer } from '@/app/actions/financial-offers'
import { requireStaff } from '@/lib/auth/require-staff'
import { getCompanyProfileForOffers } from '@/lib/ops/company-profile'
import { createClient } from '@/lib/supabase/server'

export default async function EditFinancialOfferPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff()
  const { id } = await params
  const offer = await fetchFinancialOffer(id)
  if (!offer) notFound()
  if (offer.status !== 'open') {
    redirect(`/admin/ops/financial-offers/${id}`)
  }

  const supabase = await createClient()
  const [{ profile, ibans }, { data: clients }] = await Promise.all([
    getCompanyProfileForOffers(supabase),
    supabase.from('clients').select('id, name, email').order('name'),
  ])

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <Link href={`/admin/ops/financial-offers/${id}`} className="dash-back">
        ← Back to offer
      </Link>

      <PageHeader
        title="Edit financial offer"
        description={`Update this open offer for ${offer.clientName}. Save & download regenerates the PDF.`}
      />

      <FinancialOfferForm
        savedIbans={ibans}
        upfrontPercent={profile.upfrontPercent}
        clients={clients ?? []}
        offer={offer}
      />
    </div>
  )
}
