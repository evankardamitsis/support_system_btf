import Link from 'next/link'
import { listFinancialOffers } from '@/app/actions/financial-offers'
import { listOfferProjectIds } from '@/app/actions/projects'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FinancialOffersList } from '@/components/ops/FinancialOffersList'
import { requireStaff } from '@/lib/auth/require-staff'

export default async function FinancialOffersPage() {
  const { profile } = await requireStaff()
  const offers = await listFinancialOffers()
  const isAdmin = profile.role === 'admin'
  const offerProjectIds =
    isAdmin && offers.length
      ? await listOfferProjectIds(
          offers.filter(o => o.status === 'accepted').map(o => o.id)
        )
      : {}

  return (
    <div className="space-y-6 w-full max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Financial offers"
          description="Saved offer history — download PDFs or resend to clients."
        />
        <Link href="/admin/ops/financial-offers/new" className="dash-btn-primary btn-primary shrink-0">
          New offer
        </Link>
      </div>

      <FinancialOffersList offers={offers} isAdmin={isAdmin} offerProjectIds={offerProjectIds} />
    </div>
  )
}
