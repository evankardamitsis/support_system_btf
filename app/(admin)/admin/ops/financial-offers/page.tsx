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
    <div className="financial-offers-page space-y-6 w-full">
      <PageHeader
        title="Financial offers"
        description="Saved offers — PDFs and email."
        action={
          <Link href="/admin/ops/financial-offers/new" className="dash-btn-primary btn-primary">
            New offer
          </Link>
        }
      />

      <FinancialOffersList offers={offers} isAdmin={isAdmin} offerProjectIds={offerProjectIds} />
    </div>
  )
}
