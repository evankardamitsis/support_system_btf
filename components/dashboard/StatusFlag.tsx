export function StatusFlag({
  label,
  tone = 'warn',
}: {
  label: string
  tone?: 'warn' | 'danger' | 'ok'
}) {
  return (
    <span className="status-flag" data-tone={tone}>
      {label}
    </span>
  )
}
