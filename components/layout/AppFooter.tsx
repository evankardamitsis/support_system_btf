'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BtfContactModal } from '@/components/layout/BtfContactModal'
import { BTF_WEBSITE_URL, copyrightYear, LEGAL_LINKS } from '@/lib/site/footer'

export function AppFooter({ className }: { className?: string }) {
  const year = copyrightYear()
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <>
      <footer
        className={`app-footer${className ? ` ${className}` : ''}`}
        role="contentinfo"
      >
        <div className="app-footer-inner">
          <span className="app-footer-copy">© {year} Below The Fold</span>
          <span className="app-footer-sep" aria-hidden>
            ·
          </span>
          <nav className="app-footer-nav" aria-label="Legal and contact">
            <Link href={LEGAL_LINKS.privacy.href}>{LEGAL_LINKS.privacy.label}</Link>
            <span className="app-footer-sep" aria-hidden>
              ·
            </span>
            <Link href={LEGAL_LINKS.terms.href}>{LEGAL_LINKS.terms.label}</Link>
            <span className="app-footer-sep" aria-hidden>
              ·
            </span>
            <button
              type="button"
              className="app-footer-link-btn"
              onClick={() => setContactOpen(true)}
            >
              Contact
            </button>
          </nav>
          <span className="app-footer-sep" aria-hidden>
            ·
          </span>
          <a
            href={BTF_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer-site"
          >
            belowthefold.gr
          </a>
        </div>
      </footer>

      <BtfContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  )
}
