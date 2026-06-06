import Link from 'next/link'
import { FileText, FolderKanban, Server } from 'lucide-react'
import quickStyles from '@/components/clients/client-ops-quick-actions.module.css'

function opsNewHref(path: string, clientId?: string) {
  return clientId ? `${path}?client=${encodeURIComponent(clientId)}` : path
}

export function OpsQuickActions({
  showProjects = true,
  clientId,
}: {
  showProjects?: boolean
  clientId?: string
}) {
  return (
    <div className={quickStyles.actions}>
      {showProjects ? (
        <Link
          href={opsNewHref('/admin/ops/projects/new', clientId)}
          className={`${quickStyles.btn} ${quickStyles.project}`}
        >
          <FolderKanban size={13} strokeWidth={2.25} aria-hidden />
          <span>New project</span>
        </Link>
      ) : null}
      <Link
        href={opsNewHref('/admin/ops/financial-offers/new', clientId)}
        className={`${quickStyles.btn} ${quickStyles.offer}`}
      >
        <FileText size={13} strokeWidth={2.25} aria-hidden />
        <span>New offer</span>
      </Link>
      <Link
        href={opsNewHref('/admin/ops/hosting-maintenance/new', clientId)}
        className={`${quickStyles.btn} ${quickStyles.hosting}`}
      >
        <Server size={13} strokeWidth={2.25} aria-hidden />
        <span>New hosting</span>
      </Link>
    </div>
  )
}
