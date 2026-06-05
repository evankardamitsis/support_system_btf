import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div
      data-theme="landing"
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-8 md:px-16 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Image
          src="/btf-wordmark.svg"
          alt="Below The Fold"
          width={120}
          height={16}
          priority
          style={{ height: 14, width: 'auto' }}
        />
        <Link
          href="/auth/login"
          className="text-[11px] tracking-[0.15em] uppercase px-4 py-2 cursor-pointer transition-opacity duration-150 hover:opacity-70"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            color: 'var(--text-2)',
            border: '1px solid var(--border)',
          }}
        >
          Sign in
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <main className="relative flex-1 flex flex-col justify-center px-8 md:px-16 py-16 md:py-20 overflow-hidden">
        <div
          className="landing-hero-bg grid-bg grid-bg-fade absolute inset-0 pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-12 md:gap-20 items-end max-w-6xl">
          {/* Left: headline + subtext + CTA */}
          <div>
            <h1
              className="mb-6 leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-dm-mono)' }}
            >
              {[
                { text: 'Your requests.', color: 'var(--text-1)' },
                { text: 'Tracked.', color: 'var(--accent)' },
              ].map(({ text, color }, i) => (
                <span
                  key={text}
                  className="word-reveal block"
                  style={{
                    fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
                    fontWeight: 500,
                    color,
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  {text}
                </span>
              ))}
            </h1>

            <p
              className="word-reveal text-base md:text-lg mb-10 max-w-[42ch]"
              style={{
                fontFamily: 'var(--font-geist)',
                color: 'var(--text-2)',
                lineHeight: 1.65,
                animationDelay: '220ms',
              }}
            >
              One place to submit work to BTF, see what is happening, and know when it is done.
            </p>

            <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <Link
                href="/auth/login"
                className="landing-cta group flex items-center justify-between gap-6 px-8 py-5 w-full md:w-auto md:min-w-[340px] cursor-pointer"
                style={{
                  fontFamily: 'var(--font-dm-mono)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: 0,
                }}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[10px] tracking-[0.2em] uppercase opacity-60">
                    BTF Support Portal
                  </span>
                  <span className="text-base tracking-[0.06em] uppercase font-medium">
                    Access your portal
                  </span>
                </div>
                <span className="landing-cta-arrow text-2xl" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* Right: BTF wordmark as large decorative counterweight */}
          <div
            className="hidden md:flex flex-col justify-end pb-2 word-reveal"
            style={{ animationDelay: '360ms' }}
            aria-hidden
          >
            <Image
              src="/btf-wordmark.svg"
              alt=""
              width={400}
              height={54}
              style={{
                width: '100%',
                height: 'auto',
                opacity: 0.08,
                filter: 'invert(0)',
              }}
            />
          </div>
        </div>
      </main>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-px"
          style={{ background: 'var(--border)' }}
        >
          <article className="px-10 py-10 md:py-12" style={{ background: 'var(--bg)' }}>
            <p
              className="text-sm md:text-base leading-relaxed mb-4 max-w-[38ch]"
              style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
            >
              Send a request for anything: a fix, a change, a question. It lands directly with the right person at BTF.
            </p>
            <p
              className="text-xs tracking-[0.12em] uppercase"
              style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
            >
              Submit requests
            </p>
          </article>

          <article className="px-8 py-10 md:py-12" style={{ background: 'var(--bg)' }}>
            <p
              className="text-sm leading-relaxed mb-4 max-w-[28ch]"
              style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
            >
              See exactly where each item stands, without asking.
            </p>
            <p
              className="text-xs tracking-[0.12em] uppercase"
              style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
            >
              Track progress
            </p>
          </article>

          <article className="px-8 py-10 md:py-12" style={{ background: 'var(--surface)' }}>
            <p
              className="text-sm leading-relaxed mb-4 max-w-[28ch]"
              style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
            >
              Updates come to you. No chasing, no emails back and forth.
            </p>
            <p
              className="text-xs tracking-[0.12em] uppercase"
              style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
            >
              Stay informed
            </p>
          </article>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer
        className="flex items-center justify-between px-8 md:px-16 py-5 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span
          className="text-[10px] tracking-[0.15em] uppercase"
          style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
        >
          support.belowthefold.gr
        </span>
        <a
          href="https://belowthefold.gr"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity duration-150 hover:opacity-70"
          style={{ lineHeight: 0 }}
          aria-label="Below The Fold"
        >
          <Image
            src="/btf-wordmark.svg"
            alt="belowthefold.gr"
            width={80}
            height={11}
            style={{ height: 10, width: 'auto', opacity: 0.45 }}
          />
        </a>
      </footer>
    </div>
  )
}
