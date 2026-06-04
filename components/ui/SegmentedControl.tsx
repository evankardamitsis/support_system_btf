'use client'

interface SegmentedControlProps {
  options: string[]
  value: string
  onChange: (v: string) => void
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div
      className="inline-flex"
      style={{ border: '1px solid var(--border)' }}
    >
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-4 py-2 text-[11px] tracking-[0.12em] uppercase cursor-pointer transition-colors duration-150"
            style={{
              fontFamily: 'var(--font-dm-mono)',
              background: active ? 'var(--accent)' : 'var(--surface)',
              color: active ? 'var(--bg)' : 'var(--text-2)',
              borderRight: '1px solid var(--border)',
              borderRadius: 0,
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
