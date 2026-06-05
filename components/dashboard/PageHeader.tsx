import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between anim-fade-up anim-fade-up-1">
      <div>
        <h1 className="dash-title">{title}</h1>
        {description ? <p className="dash-subtitle">{description}</p> : null}
      </div>
      {action ? <div className="dash-page-header-action shrink-0">{action}</div> : null}
    </div>
  )
}
