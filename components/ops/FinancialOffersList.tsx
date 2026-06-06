'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Download, FolderKanban, Mail, Trash2 } from 'lucide-react'
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
import { formatDateTimeHuman } from '@/lib/tickets/display'
import type { FinancialOfferRecord } from '@/lib/ops/financial-offer/types'
import { runWithToast } from '@/lib/notify'

export function FinancialOffersList({
  offers,
  isAdmin,
  offerProjectIds = {},
}: {
  offers: FinancialOfferRecord[]
  isAdmin: boolean
  offerProjectIds?: Record<string, string>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [emailPanelOfferId, setEmailPanelOfferId] = useState<string | null>(null)
  const [projectPanelOfferId, setProjectPanelOfferId] = useState<string | null>(null)
  const [deleteOffer, setDeleteOffer] = useState<FinancialOfferRecord | null>(null)

  if (offers.length === 0) {
    return (
      <div className="dash-empty">
        <p className="dash-empty-title">No offers yet</p>
        <p className="dash-empty-hint">Create your first financial offer to see it here.</p>
      </div>
    )
  }

  function handleAccept(offer: FinancialOfferRecord) {
    startTransition(async () => {
      const ok = await runWithToast(() => acceptFinancialOffer(offer.id), {
        loading: 'Marking accepted…',
        success: 'Offer marked as accepted',
      })
      if (ok === null) return
      router.refresh()
    })
  }

  function handleDelete() {
    if (!deleteOffer) return
    startTransition(async () => {
      const ok = await runWithToast(() => deleteFinancialOffer(deleteOffer.id), {
        loading: 'Deleting offer…',
        success: 'Offer deleted',
      })
      if (ok === null) return
      setDeleteOffer(null)
      router.refresh()
    })
  }

  const emailOffer = emailPanelOfferId
    ? offers.find(offer => offer.id === emailPanelOfferId) ?? null
    : null
  const projectOffer = projectPanelOfferId
    ? offers.find(offer => offer.id === projectPanelOfferId) ?? null
    : null

  return (
    <>
      <div className="financial-offers-table">
        <div className="financial-offers-grid financial-offers-grid-head">
          <span>Client</span>
          <span>Total</span>
          <span>Upfront</span>
          <span>Status</span>
          <span>Created</span>
          <span>Email</span>
          <span />
        </div>
        <div className="financial-offers-table-body">
          {offers.map(offer => {
            const projectTotal = getOfferProjectTotal(offer)
            const projectUpfront = getOfferProjectUpfront(offer)

            return (
            <div key={offer.id} className="financial-offers-entry">
              <div className="financial-offers-grid financial-offers-row">
                <div className="financial-offers-cell financial-offers-cell-primary min-w-0" data-label="Client">
                  <div className="financial-offers-primary-line">
                    <Link
                      href={`/admin/ops/financial-offers/${offer.id}`}
                      className="financial-offers-client financial-offers-client-link"
                      title={offer.clientEmail ?? undefined}
                    >
                      {offer.clientName}
                    </Link>
                    <div className="financial-offers-row-aside">
                      <div className="financial-offers-compact-badges">
                        {offer.status === 'accepted' ? (
                          <span className="financial-offers-active-badge">Accepted</span>
                        ) : (
                          <span className="financial-offers-open-badge">Open</span>
                        )}
                        {offer.emailedAt ? (
                          <span className="financial-offers-sent-badge">Sent</span>
                        ) : null}
                      </div>
                      <span className="financial-offers-compact-total tabular-nums">
                        {formatOfferCurrency(projectTotal)}
                      </span>
                    </div>
                  </div>
                  {offer.clientEmail ? (
                    <p className="ops-card-meta financial-offers-cell-email-meta truncate">
                      {offer.clientEmail}
                    </p>
                  ) : null}
                  <p className="ops-card-meta financial-offers-cell-meta tabular-nums">
                    {formatOfferCurrency(projectTotal)} total ·{' '}
                    {formatOfferCurrency(projectUpfront)} upfront
                  </p>
                </div>
                <div className="financial-offers-cell financial-offers-cell-total tabular-nums" data-label="Total">
                  {formatOfferCurrency(projectTotal)}
                </div>
                <div className="financial-offers-cell financial-offers-cell-upfront tabular-nums" data-label="Upfront">
                  {formatOfferCurrency(projectUpfront)}
                </div>
                <div className="financial-offers-cell financial-offers-cell-status" data-label="Status">
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
                </div>
                <div className="financial-offers-cell financial-offers-cell-created" data-label="Created">
                  <time dateTime={offer.createdAt} className="dash-meta">
                    {formatDateTimeHuman(offer.createdAt)}
                  </time>
                </div>
                <div className="financial-offers-cell financial-offers-cell-email" data-label="Email">
                  {offer.emailedAt ? (
                    <span className="financial-offers-sent-badge">Sent</span>
                  ) : (
                    <span className="dash-meta">Not sent</span>
                  )}
                </div>
                <div className="financial-offers-cell financial-offers-actions">
                  <a
                    href={`/api/ops/financial-offers/${offer.id}/pdf`}
                    className="financial-offers-action"
                    aria-label={`Download PDF for ${offer.clientName}`}
                  >
                    <Download size={15} />
                  </a>
                  <button
                    type="button"
                    className={`financial-offers-action cursor-pointer${
                      emailPanelOfferId === offer.id ? ' financial-offers-action--active' : ''
                    }`}
                    aria-label={`Email offer to ${offer.clientName}`}
                    aria-expanded={emailPanelOfferId === offer.id}
                    title={offer.emailedAt ? 'Resend email' : 'Email offer'}
                    disabled={pending}
                    onClick={() =>
                      setEmailPanelOfferId(prev => (prev === offer.id ? null : offer.id))
                    }
                  >
                    <Mail size={15} />
                  </button>
                  {offer.status === 'open' ? (
                    <button
                      type="button"
                      className="financial-offers-action financial-offers-action--accept cursor-pointer"
                      aria-label={`Mark offer for ${offer.clientName} as accepted`}
                      title="Mark accepted"
                      disabled={pending}
                      onClick={() => handleAccept(offer)}
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  ) : null}
                  {isAdmin && offer.status === 'accepted' ? (
                    offerProjectIds[offer.id] ? (
                      <Link
                        href={`/admin/ops/projects/${offerProjectIds[offer.id]}`}
                        className="financial-offers-action"
                        aria-label={`Open project for ${offer.clientName}`}
                        title="Open project"
                      >
                        <FolderKanban size={15} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`financial-offers-action cursor-pointer${
                          projectPanelOfferId === offer.id ? ' financial-offers-action--active' : ''
                        }`}
                        aria-label={`Create project for ${offer.clientName}`}
                        title="Create project"
                        disabled={pending}
                        onClick={() =>
                          setProjectPanelOfferId(prev => (prev === offer.id ? null : offer.id))
                        }
                      >
                        <FolderKanban size={15} />
                      </button>
                    )
                  ) : null}
                  {isAdmin ? (
                    <button
                      type="button"
                      className="financial-offers-action financial-offers-action--danger cursor-pointer"
                      aria-label={`Delete offer for ${offer.clientName}`}
                      title="Delete offer"
                      disabled={pending}
                      onClick={() => setDeleteOffer(offer)}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              </div>

            </div>
          )})}
        </div>
      </div>

      {emailOffer ? (
        <FinancialOfferEmailPanel
          offer={emailOffer}
          open
          onClose={() => setEmailPanelOfferId(null)}
        />
      ) : null}
      {projectOffer ? (
        <CreateProjectFromOfferPanel
          offerId={projectOffer.id}
          clientName={projectOffer.clientName}
          open
          onClose={() => setProjectPanelOfferId(null)}
        />
      ) : null}

      <ConfirmDeleteModal
        open={deleteOffer !== null}
        onClose={() => setDeleteOffer(null)}
        title="Delete financial offer?"
        description={
          deleteOffer ? (
            <>
              This removes the offer for <strong>{deleteOffer.clientName}</strong> from the list.
              Accepted offers will no longer count toward active offer analytics.
            </>
          ) : null
        }
        confirmLabel="Delete offer"
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  )
}
