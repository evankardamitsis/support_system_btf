import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'ticket-attachments'

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
    .select('role, client_id')
    .eq('id', user.id)
    .single()
  if (!profile) return new Response('Unauthorized', { status: 401 })

  const { data: attachment } = await supabase
    .from('ticket_attachments')
    .select('storage_path, file_name, mime_type, comment_id, ticket_id')
    .eq('id', id)
    .maybeSingle()

  if (!attachment) return new Response('Not found', { status: 404 })

  // Client visibility check: only non-internal comment attachments or ticket-level ones
  if (profile.role === 'client') {
    if (attachment.comment_id) {
      const { data: comment } = await supabase
        .from('ticket_comments')
        .select('is_internal')
        .eq('id', attachment.comment_id)
        .maybeSingle()
      if (!comment || comment.is_internal) {
        return new Response('Forbidden', { status: 403 })
      }
    }
  } else if (!['admin', 'agent'].includes(profile.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return new Response('Server error', { status: 500 })

  const { data: blob, error } = await adminResult.client.storage
    .from(BUCKET)
    .download(attachment.storage_path)

  if (error || !blob) {
    console.error('[ticket-attachment] download failed:', error)
    return new Response('Could not load file', { status: 500 })
  }

  const buffer = await blob.arrayBuffer()
  const mimeType = attachment.mime_type || 'application/octet-stream'

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
