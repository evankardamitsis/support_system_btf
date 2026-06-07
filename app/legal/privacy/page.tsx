import type { Metadata } from 'next'
import Link from 'next/link'
import { BTF_CONTACT } from '@/lib/site/contact'

export const metadata: Metadata = {
  title: 'Privacy',
}

export default function PrivacyPage() {
  return (
    <article className="legal-doc anim-fade-up">
      <p className="legal-doc-eyebrow">Legal</p>
      <h1 className="legal-doc-title">Privacy policy</h1>
      <p className="legal-doc-updated">Last updated: March 14, 2024</p>
      <p className="legal-doc-lead">
        This policy is published by Below The Fold and applies to our website, services, and the
        BTF Support portal.
      </p>

      <section className="legal-doc-section">
        <h2>1. Introduction</h2>
        <p>
          Below The Fold (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to
          protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you visit our website or use our services.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>2. Information we collect</h2>
        <h3>Personal information</h3>
        <p>We may collect personal information that you voluntarily provide to us when you:</p>
        <ul className="legal-doc-list">
          <li>Fill out contact forms</li>
          <li>Subscribe to our newsletter</li>
          <li>Request a consultation</li>
          <li>Contact us via email or phone</li>
          <li>Use the BTF Support portal (account details, tickets, project data, and uploaded files)</li>
        </ul>
        <h3>Automatically collected information</h3>
        <p>When you visit our website or use our services, we may automatically collect:</p>
        <ul className="legal-doc-list">
          <li>IP addresses</li>
          <li>Browser type</li>
          <li>Device information</li>
          <li>Usage data</li>
        </ul>
      </section>

      <section className="legal-doc-section">
        <h2>3. How we use your information</h2>
        <p>We use the collected information for various purposes:</p>
        <ul className="legal-doc-list">
          <li>To provide and maintain our services</li>
          <li>To notify you about changes to our services</li>
          <li>To provide customer support</li>
          <li>To gather analysis or valuable information to improve our services</li>
          <li>To monitor the usage of our services</li>
          <li>To detect, prevent and address technical issues</li>
        </ul>
      </section>

      <section className="legal-doc-section">
        <h2>4. Data protection</h2>
        <p>
          We implement appropriate technical and organizational measures to maintain the security of
          your personal information, including but not limited to encryption, access controls, and
          secure networks.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>5. Third-party services</h2>
        <p>
          We may employ third-party companies and individuals to facilitate our services, provide
          services on our behalf, perform service-related tasks, or assist us in analyzing how our
          services are used. These third parties have access to your personal information only to
          perform these tasks on our behalf and are obligated not to disclose or use it for any other
          purpose.
        </p>
      </section>

      <section className="legal-doc-section">
        <h2>6. Your rights</h2>
        <p>You have the right to:</p>
        <ul className="legal-doc-list">
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to our use of your data</li>
          <li>Withdraw consent at any time</li>
        </ul>
      </section>

      <section className="legal-doc-section">
        <h2>7. Contact us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at{' '}
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
