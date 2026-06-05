import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type CommentAuthor = {
  id: string
  full_name: string | null
  role: string | null
}

export type EnrichedComment = {
  id: string
  body: string
  author_id: string
  is_internal: boolean
  created_at: string
  authorName: string
  authorRole: string | null
}

export function authorDisplayName(
  author: Pick<CommentAuthor, 'full_name' | 'role'> | null | undefined
): string {
  if (!author) return 'Unknown'
  if (author.full_name?.trim()) return author.full_name.trim()
  if (author.role === 'client') return 'Client'
  return 'Team member'
}

export function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function authorRoleLabel(role: string | null): string | null {
  if (role === 'admin') return 'Admin'
  if (role === 'agent') return 'Member'
  if (role === 'client') return 'Client'
  return null
}

export async function enrichCommentsWithAuthors(
  supabase: SupabaseClient<Database>,
  comments: Array<{
    id: string
    body: string
    author_id: string
    is_internal: boolean
    created_at: string
  }>
): Promise<EnrichedComment[]> {
  if (comments.length === 0) return []

  const authorIds = [...new Set(comments.map(c => c.author_id))]
  const { data: authors } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('id', authorIds)

  const authorMap = new Map((authors ?? []).map(a => [a.id, a]))

  return comments.map(c => {
    const author = authorMap.get(c.author_id)
    return {
      ...c,
      authorName: authorDisplayName(author),
      authorRole: author?.role ?? null,
    }
  })
}
