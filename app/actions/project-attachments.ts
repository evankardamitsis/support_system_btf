'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
import { enrichCommentsWithAuthors } from '@/lib/comments/authors'
import type { OpsProjectFile, OpsProjectTaskComment } from '@/lib/ops/projects/types'

const BUCKET = 'ops-project-files'
const MAX_FILE_BYTES = 20 * 1024 * 1024

function revalidateProjectPaths(projectId: string) {
  revalidatePath('/admin/ops/projects')
  revalidatePath(`/admin/ops/projects/${projectId}`)
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, '_').slice(0, 180) || 'file'
}

async function assertProjectExists(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  projectId: string
) {
  const { data } = await supabase
    .from('ops_projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) throw new Error('Project not found')
}

async function assertTaskInProject(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  projectId: string,
  taskId: string
) {
  const { data } = await supabase
    .from('ops_project_tasks')
    .select('id')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (!data) throw new Error('Task not found')
}

function mapProjectFile(
  row: {
    id: string
    project_id: string
    task_id: string | null
    file_name: string
    mime_type: string | null
    size_bytes: number
    created_at: string
    uploaded_by: string
    task?: { title: string } | null
  },
  uploaderName: string | null
): OpsProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    taskTitle: row.task?.title ?? null,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedByName: uploaderName,
    createdAt: row.created_at,
  }
}

export async function listTaskComments(taskId: string): Promise<OpsProjectTaskComment[]> {
  const { supabase } = await requireAdminPage()

  const { data, error } = await supabase
    .from('ops_project_task_comments')
    .select('id, task_id, author_id, body, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const enriched = await enrichCommentsWithAuthors(
    supabase,
    (data ?? []).map(row => ({
      id: row.id,
      body: row.body,
      author_id: row.author_id,
      is_internal: true,
      created_at: row.created_at,
    }))
  )

  return enriched.map(row => ({
    id: row.id,
    taskId,
    authorId: row.author_id,
    authorName: row.authorName,
    authorRole: row.authorRole,
    body: row.body,
    createdAt: row.created_at,
  }))
}

export async function addTaskComment(taskId: string, body: string) {
  const { supabase, user } = await requireAdminPage()
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Comment cannot be empty')

  const { data: task } = await supabase
    .from('ops_project_tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()
  if (!task) throw new Error('Task not found')

  const { error } = await supabase.from('ops_project_task_comments').insert({
    task_id: taskId,
    author_id: user.id,
    body: trimmed,
  })
  if (error) throw new Error(error.message)

  revalidateProjectPaths(task.project_id)
}

export async function listProjectFiles(
  projectId: string,
  scope: 'project' | 'task' | 'all',
  taskId?: string
): Promise<OpsProjectFile[]> {
  const { supabase } = await requireAdminPage()
  await assertProjectExists(supabase, projectId)

  let query = supabase
    .from('ops_project_files')
    .select('*, task:ops_project_tasks(title)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (scope === 'project') {
    query = query.is('task_id', null)
  } else if (scope === 'task') {
    if (!taskId) throw new Error('Task is required')
    await assertTaskInProject(supabase, projectId, taskId)
    query = query.eq('task_id', taskId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const uploaderIds = [...new Set((data ?? []).map(row => row.uploaded_by))]
  const { data: uploaders } = uploaderIds.length
    ? await supabase.from('users').select('id, full_name').in('id', uploaderIds)
    : { data: [] }
  const uploaderNames = new Map((uploaders ?? []).map(u => [u.id, u.full_name ?? null]))

  return (data ?? []).map(row =>
    mapProjectFile(row, uploaderNames.get(row.uploaded_by) ?? null)
  )
}

export async function uploadProjectFile(formData: FormData) {
  const { supabase, user } = await requireAdminPage()

  const projectId = String(formData.get('projectId') ?? '')
  const taskIdRaw = formData.get('taskId')
  const taskId = taskIdRaw ? String(taskIdRaw) : null
  const file = formData.get('file')

  if (!projectId) throw new Error('Project is required')
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file to upload')
  if (file.size > MAX_FILE_BYTES) throw new Error('File must be 20 MB or smaller')

  await assertProjectExists(supabase, projectId)
  if (taskId) await assertTaskInProject(supabase, projectId, taskId)

  const fileId = crypto.randomUUID()
  const safeName = sanitizeFileName(file.name)
  const storagePath = `${projectId}/${fileId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
  if (uploadError) throw new Error(uploadError.message)

  const { error: insertError } = await supabase.from('ops_project_files').insert({
    id: fileId,
    project_id: projectId,
    task_id: taskId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    uploaded_by: user.id,
  })

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new Error(insertError.message)
  }

  await supabase
    .from('ops_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId)

  revalidateProjectPaths(projectId)
}

export async function deleteProjectFile(fileId: string) {
  const { supabase } = await requireAdminPage()

  const { data: file } = await supabase
    .from('ops_project_files')
    .select('id, project_id, storage_path')
    .eq('id', fileId)
    .single()
  if (!file) throw new Error('File not found')

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storage_path])
  if (storageError) throw new Error(storageError.message)

  const { error } = await supabase.from('ops_project_files').delete().eq('id', fileId)
  if (error) throw new Error(error.message)

  revalidateProjectPaths(file.project_id)
}
