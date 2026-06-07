import { PageHeader } from '@/components/dashboard/PageHeader'
import { DesktopDownloadPanel } from '@/components/desktop/DesktopDownloadPanel'
import { isMacosDesktopReleasePublished } from '@/lib/desktop/release-server'
import { requireStaffPage } from '@/lib/auth/require-staff-page'

export default async function AdminDesktopPage() {
  await requireStaffPage()

  const downloadAvailable = await isMacosDesktopReleasePublished()

  return (
    <div className="space-y-5 w-full max-w-2xl">
      <PageHeader
        title="Desktop app"
        description="Install BTF Support on your Mac for a faster staff workflow."
      />
      <DesktopDownloadPanel downloadAvailable={downloadAvailable} />
    </div>
  )
}
