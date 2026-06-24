'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { isTicketClosed } from '@/lib/tickets/closed'

const BUCKET = 'ticket-attachments'
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_MIME_PREFIXES = ['image/']

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, '_').slice(0, 180) || 'file'
}

export type TicketAttachmentItem = {
  id: string
  fileName: string
  mimeType: string | null
}

export async function uploadTicketAttachment(
  ticketId: string,
  commentId: string | null,
  formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()
  if (!profile) throw new Error('User not found')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, client_id, status')
    .eq('id', ticketId)
    .single()
  if (!ticket) throw new Error('Ticket not found')
  if (isTicketClosed(ticket.status)) throw new Error('Ticket is closed')

  // Clients can only upload to their own tickets
  if (profile.role === 'client' && profile.client_id !== ticket.client_id) {
    throw new Error('Not authorized')
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) throw new Error('No file provided')
  if (file.size > MAX_FILE_BYTES) throw new Error('Image must be 10 MB or smaller')
  if (!ACCEPTED_MIME_PREFIXES.some(p => file.type.startsWith(p))) {
    throw new Error('Only image files are supported')
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) throw new Error(adminResult.error)
  const admin = adminResult.client

  const fileId = crypto.randomUUID()
  const safeName = sanitizeFileName(file.name)
  const storagePath = `${ticketId}/${fileId}/${safeName}`

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
  if (uploadError) throw new Error(uploadError.message)

  const { error: insertError } = await admin.from('ticket_attachments').insert({
    ticket_id: ticketId,
    comment_id: commentId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    uploaded_by: user.id,
  })

  if (insertError) {
    await admin.storage.from(BUCKET).remove([storagePath])
    throw new Error(insertError.message)
  }

  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath(`/portal/tickets/${ticketId}`)
}

export async function getTicketAttachments(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  ticketId: string
): Promise<{ commentId: string | null; items: TicketAttachmentItem[] }[]> {
  const { data, error } = await supabase
    .from('ticket_attachments')
    .select('id, comment_id, file_name, mime_type')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ticket-attachments] fetch failed:', error.message)
    return []
  }

  // Group by comment_id (null = ticket-level)
  const grouped = new Map<string | null, TicketAttachmentItem[]>()
  for (const row of data ?? []) {
    const key = row.comment_id
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push({
      id: row.id,
      fileName: row.file_name,
      mimeType: row.mime_type,
    })
  }

  return Array.from(grouped.entries()).map(([commentId, items]) => ({ commentId, items }))
}
