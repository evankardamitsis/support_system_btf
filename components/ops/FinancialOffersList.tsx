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
import { formatOfferCurrency } from '@/lib/ops/financial-offer/calculate'
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
          {offers.map(offer => (
            <div key={offer.id} className="financial-offers-entry">
              <div className="financial-offers-grid financial-offers-row">
                <div className="financial-offers-cell financial-offers-cell-primary min-w-0" data-label="Client">
                  <p className="financial-offers-client">{offer.clientName}</p>
                  {offer.clientEmail ? (
                    <p className="ops-card-meta truncate">{offer.clientEmail}</p>
                  ) : (
                    <p className="ops-card-meta">No email saved</p>
                  )}
                </div>
                <div className="financial-offers-cell financial-offers-cell-total tabular-nums" data-label="Total">
                  {formatOfferCurrency(offer.totalAmount)}
                </div>
                <div className="financial-offers-cell financial-offers-cell-upfront tabular-nums" data-label="Upfront">
                  {formatOfferCurrency(offer.upfrontAmount)}
                </div>
                <div className="financial-offers-cell financial-offers-cell-status" data-label="Status">
                  {offer.status === 'accepted' ? (
                    <span className="financial-offers-active-badge">Accepted</span>
                  ) : (
                    <span className="dash-meta">Open</span>
                  )}
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

              {emailPanelOfferId === offer.id ? (
                <FinancialOfferEmailPanel
                  offer={offer}
                  onClose={() => setEmailPanelOfferId(null)}
                />
              ) : null}
              {projectPanelOfferId === offer.id ? (
                <CreateProjectFromOfferPanel
                  offerId={offer.id}
                  clientName={offer.clientName}
                  onClose={() => setProjectPanelOfferId(null)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

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
