interface StatCardProps {
  label: string
  value: string | number
  accent?: boolean
}

export function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.12em]"
        style={{ color: 'var(--text-3)', fontFamily: 'var(--font-dm-mono)' }}
      >
        {label}
      </p>
      <p
        className="text-2xl leading-none tabular-nums"
        style={{
          color: accent ? 'var(--accent)' : 'var(--text-1)',
          fontFamily: 'var(--font-dm-mono)',
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </p>
    </div>
  )
}
