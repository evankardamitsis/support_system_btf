import type { ReactNode } from 'react'

export function FormPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="dash-panel">
      <div className="dash-card-section px-5 py-3">
        <h2 className="dash-section-title">{title}</h2>
      </div>
      <div className="dash-form-body">{children}</div>
    </div>
  )
}
