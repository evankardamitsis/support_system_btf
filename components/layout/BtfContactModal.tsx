'use client'

import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { BTF_CONTACT } from '@/lib/site/contact'

export function BtfContactModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useModalDialog(open, onClose)

  return (
    <dialog ref={dialogRef} className="app-modal app-contact-modal" aria-labelledby="btf-contact-title">
      {open ? (
        <div className="app-modal-inner">
          <h2 id="btf-contact-title" className="app-modal-title">
            Contact
          </h2>
          <p className="app-modal-lead">Reach the Below The Fold team directly.</p>
          <dl className="app-contact-list">
            <div className="app-contact-item">
              <dt className="app-contact-label">Email</dt>
              <dd className="app-contact-value">
                <a href={`mailto:${BTF_CONTACT.email}`}>{BTF_CONTACT.email}</a>
              </dd>
            </div>
            <div className="app-contact-item">
              <dt className="app-contact-label">Phone</dt>
              <dd className="app-contact-value">
                <a href={`tel:${BTF_CONTACT.phoneTel}`}>{BTF_CONTACT.phoneDisplay}</a>
              </dd>
            </div>
          </dl>
          <div className="app-modal-actions">
            <button type="button" className="dash-btn-secondary cursor-pointer" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
