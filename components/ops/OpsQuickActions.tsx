import Link from 'next/link'
import { FileText, FolderKanban, Server } from 'lucide-react'
import quickStyles from '@/components/clients/client-ops-quick-actions.module.css'

export function OpsQuickActions({ showProjects = true }: { showProjects?: boolean }) {
  return (
    <div className={quickStyles.actions}>
      {showProjects ? (
        <Link
          href="/admin/ops/projects/new"
          className={`${quickStyles.btn} ${quickStyles.project}`}
        >
          <FolderKanban size={13} strokeWidth={2.25} aria-hidden />
          <span>New project</span>
        </Link>
      ) : null}
      <Link
        href="/admin/ops/financial-offers/new"
        className={`${quickStyles.btn} ${quickStyles.offer}`}
      >
        <FileText size={13} strokeWidth={2.25} aria-hidden />
        <span>New offer</span>
      </Link>
      <Link
        href="/admin/ops/hosting-maintenance/new"
        className={`${quickStyles.btn} ${quickStyles.hosting}`}
      >
        <Server size={13} strokeWidth={2.25} aria-hidden />
        <span>New hosting</span>
      </Link>
    </div>
  )
}
