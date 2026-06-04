export function AuthError({ message }: { message: string }) {
  return (
    <div
      className="px-4 py-3"
      style={{
        background: 'rgba(255,68,68,0.08)',
        border: '1px solid rgba(255,68,68,0.3)',
        color: 'var(--danger)',
        fontFamily: 'var(--font-geist)',
        fontSize: 14,
      }}
      role="alert"
    >
      {message}
    </div>
  )
}

export function AuthSuccess({ message }: { message: string }) {
  return (
    <div
      className="px-4 py-3"
      style={{
        background: 'rgba(68,204,136,0.08)',
        border: '1px solid rgba(68,204,136,0.28)',
        color: 'var(--success)',
        fontFamily: 'var(--font-geist)',
        fontSize: 14,
      }}
      role="status"
    >
      {message}
    </div>
  )
}
