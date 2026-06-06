import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'

const BUCKET = 'ops-project-files'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isBtfStaffRole(profile?.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { data: file } = await supabase
    .from('ops_project_files')
    .select('storage_path, file_name, mime_type')
    .eq('id', id)
    .maybeSingle()

  if (!file) return new Response('Not found', { status: 404 })

  const { data: blob, error } = await supabase.storage.from(BUCKET).download(file.storage_path)
  if (error || !blob) {
    console.error('[ops-project-file] download failed:', error)
    return new Response('Could not load file', { status: 500 })
  }

  const buffer = await blob.arrayBuffer()
  const safeName = file.file_name.replace(/["\r\n]/g, '_')

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
