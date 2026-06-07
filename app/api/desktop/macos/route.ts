import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MACOS_DESKTOP_RELEASE_BUCKET,
  MACOS_DESKTOP_RELEASE_FILE,
  getMacosDesktopDownloadUrl,
} from '@/lib/desktop/release'
import {
  createGithubDesktopDownloadUrl,
  isGithubReleaseConfigured,
} from '@/lib/desktop/github-release'
import { createR2PresignedDownloadUrl, isR2Configured } from '@/lib/desktop/r2'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const explicitUrl = getMacosDesktopDownloadUrl()
  if (explicitUrl) {
    return NextResponse.redirect(explicitUrl)
  }

  if (isGithubReleaseConfigured()) {
    const downloadUrl = await createGithubDesktopDownloadUrl()
    if (downloadUrl) {
      return NextResponse.redirect(downloadUrl)
    }

    return NextResponse.json(
      { error: 'macOS desktop app is not published yet.' },
      { status: 404 }
    )
  }

  if (isR2Configured()) {
    const signedUrl = await createR2PresignedDownloadUrl(60 * 60)
    if (signedUrl) {
      return NextResponse.redirect(signedUrl)
    }

    return NextResponse.json(
      { error: 'macOS desktop app is not published yet.' },
      { status: 404 }
    )
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(MACOS_DESKTOP_RELEASE_BUCKET)
      .createSignedUrl(MACOS_DESKTOP_RELEASE_FILE, 60 * 60)

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: 'macOS desktop app is not published yet.' },
        { status: 404 }
      )
    }

    return NextResponse.redirect(data.signedUrl)
  } catch {
    return NextResponse.json(
      { error: 'Desktop download is not configured.' },
      { status: 503 }
    )
  }
}
