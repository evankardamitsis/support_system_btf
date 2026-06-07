import type { Metadata } from 'next'
import Link from 'next/link'
import { BTF_CONTACT } from '@/lib/site/contact'

export const metadata: Metadata = {
  title: 'Terms',
}

export default function TermsPage() {
  return (
    <article className="legal-doc anim-fade-up">
      <p className="legal-doc-eyebrow">Legal</p>
      <h1 className="legal-doc-title">Terms of use</h1>
      <p className="legal-doc-updated">Last updated: March 14, 2024</p>
      <p className="legal-doc-lead">
        These terms govern your use of Below The Fold services, including the BTF Support portal.
        By accessing or using our services, you agree to these terms.
      </p>

      <section className="legal-doc-section">
        <h2>1. Services</h2>
        <p>
          Below The Fold (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) provides design,
          development, and growth services, including client support and project collaboration
          through the BTF Support portal. Specific deliverables, timelines, and service levels are
          defined in your agreement with us.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>2. Acceptable use</h2>
        <p>You agree to use our services only for lawful business purposes. You must not:</p>
        <ul className="legal-doc-list">
          <li>Attempt to access data or accounts you are not authorised to use</li>
          <li>Interfere with or disrupt the operation or security of our services</li>
          <li>Upload malicious code or content that infringes third-party rights</li>
          <li>Share login credentials outside your authorised team</li>
        </ul>
      </section>

      <section className="legal-doc-section">
        <h2>3. Accounts and access</h2>
        <p>
          Portal access is granted to authorised users only. You are responsible for maintaining the
          confidentiality of your credentials and for activity under your account. Notify us
          promptly if you suspect unauthorised access.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>4. Intellectual property</h2>
        <p>
          Unless otherwise agreed in writing, intellectual property and work product terms are set out
          in your client agreement. Our website, brand assets, and platform remain the property of
          Below The Fold.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>5. Availability</h2>
        <p>
          We aim to keep our services available and reliable but may perform maintenance, updates, or
          changes without prior notice. We are not liable for temporary interruptions beyond our
          reasonable control.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>6. Privacy</h2>
        <p>
          Our collection and use of personal information is described in our{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>, which forms part of these terms.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>7. Contact us</h2>
        <p>
          Questions about these terms? Contact us at{' '}
          <a href={`mailto:${BTF_CONTACT.email}`}>{BTF_CONTACT.email}</a> or{' '}
          <a href={`tel:${BTF_CONTACT.phoneTel}`}>{BTF_CONTACT.phoneDisplay}</a>.
        </p>
      </section>

      <p className="legal-doc-back">
        <Link href="/auth/login">← Back to sign in</Link>
      </p>
    </article>
  )
}
