'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FolderKanban, Mail, Pencil, Trash2 } from 'lucide-react'
import {
  acceptFinancialOffer,
  deleteFinancialOffer,
} from '@/app/actions/financial-offers'
import { CreateProjectFromOfferPanel } from '@/components/ops/projects/CreateProjectFromOfferPanel'
import { FinancialOfferEmailPanel } from '@/components/ops/FinancialOfferEmailPanel'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import {
  formatOfferCurrency,
  getOfferProjectTotal,
  getOfferProjectUpfront,
} from '@/lib/ops/financial-offer/calculate'
import { formatDateTimeHuman, formatResolvedAtTable } from '@/lib/tickets/display'
import type { FinancialOfferRecord } from '@/lib/ops/financial-offer/types'
import { triggerOfferAcceptedCelebration } from '@/lib/celebration/offer-accepted'
import { runWithToast } from '@/lib/notify'

type FinancialOfferDetailProps = {
  offer: FinancialOfferRecord
  isAdmin: boolean
  projectId?: string | null
}

export function FinancialOfferDetail({
  offer,
  isAdmin,
  projectId = null,
}: FinancialOfferDetailProps) {
  const projectTotal = getOfferProjectTotal(offer)
  const projectUpfront = getOfferProjectUpfront(offer)
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [emailOpen, setEmailOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleAccept() {
    startTransition(async () => {
      const ok = await runWithToast(() => acceptFinancialOffer(offer.id), {
        loading: 'Marking accepted…',
        success: 'Offer marked as accepted',
      })
      if (ok === null) return
      triggerOfferAcceptedCelebration()
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await runWithToast(() => deleteFinancialOffer(offer.id), {
        loading: 'Deleting offer…',
        success: 'Offer deleted',
      })
      if (ok === null) return
      setDeleteOpen(false)
      router.push('/admin/ops/financial-offers')
    })
  }

  return (
    <>
      <div className="dash-card financial-offer-detail">
        <div className="financial-offer-detail-toolbars">
        <div className="financial-offer-detail-toolbar financial-offer-detail-toolbar--desktop flex flex-wrap items-center gap-2">
          <a
            href={`/api/ops/financial-offers/${offer.id}/pdf`}
            className="dash-btn-secondary btn-secondary"
          >
            Download PDF
          </a>
          {offer.status === 'open' ? (
            <Link
              href={`/admin/ops/financial-offers/${offer.id}/edit`}
              className="dash-btn-secondary btn-secondary"
            >
              Edit offer
            </Link>
          ) : null}
          <button
            type="button"
            className="dash-btn-secondary btn-secondary cursor-pointer"
            disabled={pending}
            onClick={() => setEmailOpen(true)}
          >
            {offer.emailedAt ? 'Resend email' : 'Email offer'}
          </button>
          {offer.status === 'open' ? (
            <button
              type="button"
              className="dash-btn-secondary btn-secondary cursor-pointer"
              disabled={pending}
              onClick={handleAccept}
            >
              Mark accepted
            </button>
          ) : null}
          {isAdmin && offer.status === 'accepted' ? (
            projectId ? (
              <Link
                href={`/admin/ops/projects/${projectId}`}
                className="dash-btn-secondary btn-secondary"
              >
                Open project
              </Link>
            ) : (
              <button
                type="button"
                className="dash-btn-secondary btn-secondary cursor-pointer"
                disabled={pending}
                onClick={() => setProjectOpen(true)}
              >
                Create project
              </button>
            )
          ) : null}
          {isAdmin ? (
            <button
              type="button"
              className="dash-btn-danger btn-danger cursor-pointer"
              disabled={pending}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
          ) : null}
        </div>

        <div className="financial-offer-detail-toolbar financial-offer-detail-toolbar--mobile financial-offers-actions">
          {offer.status === 'open' ? (
            <Link
              href={`/admin/ops/financial-offers/${offer.id}/edit`}
              className="financial-offers-action"
              aria-label="Edit offer"
              title="Edit offer"
            >
              <Pencil size={15} />
            </Link>
          ) : null}
          <button
            type="button"
            className="financial-offers-action cursor-pointer"
            aria-label={offer.emailedAt ? 'Resend email' : 'Email offer'}
            title={offer.emailedAt ? 'Resend email' : 'Email offer'}
            disabled={pending}
            onClick={() => setEmailOpen(true)}
          >
            <Mail size={15} />
          </button>
          {offer.status === 'open' ? (
            <button
              type="button"
              className="financial-offers-action financial-offers-action--accept cursor-pointer"
              aria-label="Mark accepted"
              title="Mark accepted"
              disabled={pending}
              onClick={handleAccept}
            >
              <CheckCircle2 size={15} />
            </button>
          ) : null}
          {isAdmin && offer.status === 'accepted' ? (
            projectId ? (
              <Link
                href={`/admin/ops/projects/${projectId}`}
                className="financial-offers-action"
                aria-label="Open project"
                title="Open project"
              >
                <FolderKanban size={15} />
              </Link>
            ) : (
              <button
                type="button"
                className="financial-offers-action cursor-pointer"
                aria-label="Create project"
                title="Create project"
                disabled={pending}
                onClick={() => setProjectOpen(true)}
              >
                <FolderKanban size={15} />
              </button>
            )
          ) : null}
          {isAdmin ? (
            <button
              type="button"
              className="financial-offers-action financial-offers-action--danger cursor-pointer"
              aria-label="Delete offer"
              title="Delete offer"
              disabled={pending}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
        </div>

        <div className="dash-card-section px-5 py-4 space-y-4">
          <div className="financial-offer-detail-compact">
            <p className="financial-offer-detail-compact-line">
              {offer.clientEmail ? (
                <span className="financial-offer-detail-compact-email">{offer.clientEmail}</span>
              ) : (
                <span className="financial-offer-detail-compact-email">No email</span>
              )}
              <span className="financial-offer-detail-compact-sep">·</span>
              <time dateTime={offer.createdAt}>{formatResolvedAtTable(offer.createdAt)}</time>
            </p>
            <p className="financial-offer-detail-compact-totals tabular-nums">
              {formatOfferCurrency(projectTotal)} total ·{' '}
              {formatOfferCurrency(projectUpfront)} upfront ({offer.upfrontPercent}%)
              {offer.excludeVat ? ' · excl. VAT' : ''}
            </p>
          </div>

          <div className="financial-offer-detail-meta">
            <div>
              <p className="dash-meta">Client</p>
              <p className="financial-offers-client">{offer.clientName}</p>
              {offer.clientEmail ? (
                <p className="ops-card-meta">{offer.clientEmail}</p>
              ) : (
                <p className="ops-card-meta">No email on file</p>
              )}
            </div>
            <div>
              <p className="dash-meta">Created</p>
              <time dateTime={offer.createdAt} className="dash-meta">
                {formatDateTimeHuman(offer.createdAt)}
              </time>
            </div>
            {offer.acceptedAt ? (
              <div>
                <p className="dash-meta">Accepted</p>
                <time dateTime={offer.acceptedAt} className="dash-meta">
                  {formatDateTimeHuman(offer.acceptedAt)}
                </time>
              </div>
            ) : null}
          </div>

          <div className="financial-offer-detail-lines">
            <p className="dash-meta mb-2 financial-offer-detail-lines-label">Line items</p>
            <div className="financial-offer-detail-table">
              <div className="financial-offer-detail-table-head">
                <span>Work</span>
                <span>Cost</span>
              </div>
              {offer.lineItems.map((row, index) => (
                <div key={`${row.work}-${index}`} className="financial-offer-detail-table-row">
                  <span className="financial-offer-detail-work">{row.work}</span>
                  <span className="financial-offer-detail-cost tabular-nums">
                    {formatOfferCurrency(row.cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {offer.hostingMaintenance ? (
            <>
              <p className="financial-offer-detail-hosting financial-offer-detail-hosting--mobile">
                <span className="financial-offer-detail-hosting-label">Hosting</span>
                {offer.hostingMaintenance}
              </p>
              <div className="financial-offer-detail-hosting-desktop">
                <p className="dash-meta">Hosting & maintenance</p>
                <p>{offer.hostingMaintenance}</p>
              </div>
            </>
          ) : null}

          {offer.ibans.length > 0 ? (
            <div className="financial-offer-detail-ibans-section">
              <p className="dash-meta mb-2">Bank accounts</p>
              <ul className="financial-offer-detail-ibans">
                {offer.ibans.map((iban, index) => (
                  <li key={`${iban.iban}-${index}`}>
                    <strong>{iban.bankName}</strong>
                    <span className="ops-card-meta block">{iban.iban}</span>
                    <span className="ops-card-meta block">SWIFT/BIC: {iban.swiftBic}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="financial-offer-detail-totals">
            <div>
              <p className="dash-meta">Total</p>
              <p className="financial-offers-client tabular-nums">
                {formatOfferCurrency(projectTotal)}
              </p>
            </div>
            <div>
              <p className="dash-meta">Upfront ({offer.upfrontPercent}%)</p>
              <p className="financial-offers-client tabular-nums">
                {formatOfferCurrency(projectUpfront)}
              </p>
            </div>
            {offer.excludeVat ? (
              <p className="ops-card-meta financial-offer-detail-vat-note">
                Costs shown excl. VAT (24%)
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {emailOpen ? (
        <FinancialOfferEmailPanel offer={offer} open onClose={() => setEmailOpen(false)} />
      ) : null}
      {projectOpen ? (
        <CreateProjectFromOfferPanel
          offerId={offer.id}
          clientName={offer.clientName}
          open
          onClose={() => setProjectOpen(false)}
        />
      ) : null}
      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete financial offer?"
        description={
          <>
            This removes the offer for <strong>{offer.clientName}</strong> from the list. Accepted
            offers will no longer count toward active offer analytics.
          </>
        }
        confirmLabel="Delete offer"
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  )
}
