import Link from 'next/link'

export function EmailConfirmationMessage({
  email,
  clientName,
  variant = 'client',
}: {
  email: string
  clientName?: string | null
  variant?: 'client' | 'staff'
}) {
  const destination =
    variant === 'staff' ? 'the support dashboard' : 'your portal'

  return (
    <div className="flex flex-col gap-6">
      <p
        className="text-base leading-relaxed"
        style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
      >
        {variant === 'staff' ? (
          <>
            Your BTF Support{' '}
            {clientName ? (
              <>
                account for{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{clientName}</span>
              </>
            ) : (
              'team account'
            )}{' '}
            is almost ready.
          </>
        ) : clientName ? (
          <>
            Your account for{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{clientName}</span> is almost
            ready.
          </>
        ) : (
          <>Your account is almost ready.</>
        )}{' '}
        We sent a confirmation link to:
      </p>
      <p
        className="text-sm px-4 py-3 break-all"
        style={{
          fontFamily: 'var(--font-dm-mono)',
          color: 'var(--text-1)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-2)',
        }}
      >
        {email}
      </p>
      <p
        className="text-base leading-relaxed"
        style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
      >
        Open that email and click the link to confirm your address. You&apos;ll land in{' '}
        {destination}, signed in — no need to fill this form again.
      </p>
      <p
        className="text-sm"
        style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
      >
        Already confirmed?{' '}
        <Link
          href="/auth/login"
          className="hover:opacity-70 transition-opacity"
          style={{ color: 'var(--accent)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
