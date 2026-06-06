import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchFinancialOffer } from '@/app/actions/financial-offers'
import { FinancialOfferDetail } from '@/components/ops/FinancialOfferDetail'
import { requireStaff } from '@/lib/auth/require-staff'
import { createClient } from '@/lib/supabase/server'
import { getProjectIdForOffer } from '@/lib/ops/projects/service'
import { formatOfferCurrency, getOfferProjectTotal } from '@/lib/ops/financial-offer/calculate'

export default async function FinancialOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { profile } = await requireStaff()
  const { id } = await params
  const offer = await fetchFinancialOffer(id)
  if (!offer) notFound()

  const isAdmin = profile.role === 'admin'
  const projectId =
    isAdmin && offer.status === 'accepted'
      ? await getProjectIdForOffer(await createClient(), id)
      : null
  const projectTotal = getOfferProjectTotal(offer)

  return (
    <div className="financial-offer-detail-page space-y-6 w-full max-w-3xl">
      <Link href="/admin/ops/financial-offers" className="dash-back financial-offer-detail-back">
        ← Offers
      </Link>

      <header className="financial-offer-page-header anim-fade-up anim-fade-up-1">
        <div className="financial-offer-page-header-text">
          <h1 className="dash-title">{offer.clientName}</h1>
          <p className="dash-subtitle financial-offer-page-header-desc">
            {formatOfferCurrency(projectTotal)} total
          </p>
        </div>
        <div className="financial-offer-page-header-aside">
          <div className="financial-offers-status-group">
            {offer.status === 'accepted' ? (
              <span className="financial-offers-active-badge">Accepted</span>
            ) : (
              <span className="financial-offers-open-badge">Open</span>
            )}
            {offer.emailedAt ? (
              <span className="financial-offers-sent-badge">Sent</span>
            ) : null}
          </div>
          <a
            href={`/api/ops/financial-offers/${offer.id}/pdf`}
            className="financial-offer-detail-pdf-link dash-btn-secondary btn-secondary"
          >
            PDF
          </a>
        </div>
      </header>

      <FinancialOfferDetail offer={offer} isAdmin={isAdmin} projectId={projectId} />
    </div>
  )
}
