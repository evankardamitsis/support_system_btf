import { createAdminClient } from '@/lib/supabase/admin'
import {
  MACOS_DESKTOP_RELEASE_BUCKET,
  MACOS_DESKTOP_RELEASE_FILE,
} from '@/lib/desktop/release'
import {
  isGithubDesktopReleasePublished,
  isGithubReleaseConfigured,
} from '@/lib/desktop/github-release'
import { isR2Configured, isR2DesktopReleasePublished } from '@/lib/desktop/r2'

export async function isMacosDesktopReleasePublished() {
  const explicit = process.env.NEXT_PUBLIC_MACOS_DESKTOP_DOWNLOAD_URL?.trim()
  if (explicit) return true

  if (isGithubReleaseConfigured()) {
    return isGithubDesktopReleasePublished()
  }

  if (isR2Configured()) {
    return isR2DesktopReleasePublished()
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(MACOS_DESKTOP_RELEASE_BUCKET)
      .createSignedUrl(MACOS_DESKTOP_RELEASE_FILE, 60)

    return !error && Boolean(data?.signedUrl)
  } catch {
    return false
  }
}
