'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
import type { Database } from '@/lib/database.types'
import { getOfferProjectTotal } from '@/lib/ops/financial-offer/calculate'
import {
  applyProjectTemplate,
  getOpsProjectDetail,
  getProjectIdForOffer,
  listOpsProjects,
} from '@/lib/ops/projects/service'
import type {
  PhaseStatus,
  ProjectStatus,
  ProjectTemplateKey,
  TaskPriority,
  TaskStatus,
} from '@/lib/ops/projects/types'

async function assertStaffAssignee(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  assigneeId: string
) {
  const { data: assignee } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', assigneeId)
    .maybeSingle()
  if (!assignee || !['admin', 'agent'].includes(assignee.role)) {
    throw new Error('Assignee must be an admin or agent')
  }
}

function revalidateProjectPaths(projectId?: string) {
  revalidatePath('/admin/ops/projects')
  revalidatePath('/admin/ops/projects/new')
  revalidatePath('/admin/ops/financial-offers')
  if (projectId) revalidatePath(`/admin/ops/projects/${projectId}`)
}

export async function listProjects() {
  const { supabase } = await requireAdminPage()
  return listOpsProjects(supabase)
}

export async function getProject(projectId: string) {
  const { supabase } = await requireAdminPage()
  return getOpsProjectDetail(supabase, projectId)
}

export async function listProjectStaff() {
  const { supabase } = await requireAdminPage()
  const { data } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('role', ['admin', 'agent'])
    .order('full_name')
  return (data ?? []).map(u => ({
    id: u.id,
    name: u.full_name ?? u.id,
    role: u.role,
  }))
}

export async function listProjectClients() {
  const { supabase } = await requireAdminPage()
  const { data } = await supabase.from('clients').select('id, name').order('name')
  return data ?? []
}

export async function createProject(input: {
  name: string
  isInternal: boolean
  clientId?: string | null
  templateKey: ProjectTemplateKey
  leadId?: string | null
  description?: string | null
  startDate?: string | null
  targetDate?: string | null
  costAmount?: number | null
}) {
  const { supabase, user } = await requireAdminPage()

  const name = input.name.trim()
  if (!name) throw new Error('Project name is required')
  if (input.isInternal && input.clientId) {
    throw new Error('Internal projects cannot be linked to a client')
  }

  const { data, error } = await supabase
    .from('ops_projects')
    .insert({
      name,
      is_internal: input.isInternal,
      client_id: input.isInternal ? null : input.clientId || null,
      template_key: input.templateKey,
      lead_id: input.leadId || null,
      description: input.description?.trim() || null,
      start_date: input.startDate || null,
      target_date: input.targetDate || null,
      cost_amount: input.costAmount ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Could not create project')

  await applyProjectTemplate(supabase, data.id, input.templateKey)
  revalidateProjectPaths(data.id)
  return data.id as string
}

export async function createProjectFromOffer(offerId: string, templateKey: ProjectTemplateKey) {
  const { supabase, user } = await requireAdminPage()

  const existing = await getProjectIdForOffer(supabase, offerId)
  if (existing) throw new Error('A project already exists for this offer')

  const { data: offer, error: offerError } = await supabase
    .from('financial_offers')
    .select('id, client_name, status, total_amount, line_items, hosting_maintenance, upfront_percent')
    .eq('id', offerId)
    .is('deleted_at', null)
    .single()

  if (offerError || !offer) throw new Error('Offer not found')
  if (offer.status !== 'accepted') throw new Error('Only accepted offers can become projects')

  const lineItems =
    (offer.line_items as Array<{ work: string; cost: number }> | null) ?? []
  const projectCost = getOfferProjectTotal({
    lineItems,
    totalAmount: Number(offer.total_amount),
    hostingMaintenance: offer.hosting_maintenance,
  })

  const { data, error } = await supabase
    .from('ops_projects')
    .insert({
      name: offer.client_name,
      is_internal: false,
      financial_offer_id: offer.id,
      template_key: templateKey,
      cost_amount: projectCost,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Could not create project')

  await applyProjectTemplate(supabase, data.id, templateKey)

  const items = lineItems
  if (items.length && templateKey === 'blank') {
    const { data: phase } = await supabase
      .from('ops_project_phases')
      .insert({ project_id: data.id, name: 'Scope from offer', sort_order: 0 })
      .select('id')
      .single()

    if (phase) {
      await supabase.from('ops_project_tasks').insert(
        items.map((item, index) => ({
          project_id: data.id,
          phase_id: phase.id,
          title: item.work,
          sort_order: index,
        }))
      )
    }
  }

  revalidateProjectPaths(data.id)
  return data.id as string
}

export async function updateProjectCost(projectId: string, costAmount: number | null) {
  const { supabase } = await requireAdminPage()
  if (costAmount != null && costAmount < 0) throw new Error('Project cost cannot be negative')

  const { error } = await supabase
    .from('ops_projects')
    .update({
      cost_amount: costAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
  if (error) throw new Error(error.message)
  revalidateProjectPaths(projectId)
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const { supabase } = await requireAdminPage()
  const { error } = await supabase
    .from('ops_projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId)
  if (error) throw new Error(error.message)
  revalidateProjectPaths(projectId)
}

export async function completeProject(projectId: string) {
  const { supabase } = await requireAdminPage()

  const { data: project } = await supabase
    .from('ops_projects')
    .select('id, status')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) throw new Error('Project not found')
  if (project.status === 'completed') throw new Error('Project is already completed')
  if (project.status === 'archived') throw new Error('Archived projects cannot be completed')

  const now = new Date().toISOString()

  const { error: tasksError } = await supabase
    .from('ops_project_tasks')
    .update({ status: 'done', updated_at: now })
    .eq('project_id', projectId)
    .neq('status', 'done')

  if (tasksError) throw new Error(tasksError.message)

  const { error: phasesError } = await supabase
    .from('ops_project_phases')
    .update({ status: 'done' })
    .eq('project_id', projectId)
    .neq('status', 'done')

  if (phasesError) throw new Error(phasesError.message)

  const { error: projectError } = await supabase
    .from('ops_projects')
    .update({ status: 'completed', updated_at: now })
    .eq('id', projectId)

  if (projectError) throw new Error(projectError.message)

  revalidateProjectPaths(projectId)
}

export async function deleteProject(projectId: string) {
  const { supabase, user } = await requireAdminPage()
  const { error } = await supabase
    .from('ops_projects')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
  if (error) throw new Error(error.message)
  revalidateProjectPaths()
}

export async function updatePhaseStatus(phaseId: string, status: PhaseStatus) {
  const { supabase } = await requireAdminPage()
  const { data: phase } = await supabase
    .from('ops_project_phases')
    .select('project_id')
    .eq('id', phaseId)
    .single()
  const { error } = await supabase.from('ops_project_phases').update({ status }).eq('id', phaseId)
  if (error) throw new Error(error.message)
  if (phase) revalidateProjectPaths(phase.project_id)
}

export async function createTask(input: {
  projectId: string
  phaseId?: string | null
  parentId?: string | null
  title: string
  assigneeId?: string | null
  priority?: TaskPriority
  dueDate?: string | null
}) {
  const { supabase } = await requireAdminPage()
  const title = input.title.trim()
  if (!title) throw new Error('Task title is required')

  if (input.assigneeId) await assertStaffAssignee(supabase, input.assigneeId)

  if (input.parentId) {
    const { data: parent } = await supabase
      .from('ops_project_tasks')
      .select('id, parent_id, project_id, phase_id')
      .eq('id', input.parentId)
      .single()
    if (!parent || parent.parent_id) throw new Error('Subtasks can only be added to top-level tasks')
    if (parent.project_id !== input.projectId) throw new Error('Invalid parent task')
  }

  const { error } = await supabase.from('ops_project_tasks').insert({
    project_id: input.projectId,
    phase_id: input.phaseId ?? null,
    parent_id: input.parentId ?? null,
    title,
    assignee_id: input.assigneeId || null,
    priority: input.priority ?? 'normal',
    due_date: input.dueDate || null,
  })

  if (error) throw new Error(error.message)

  await supabase
    .from('ops_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.projectId)

  revalidateProjectPaths(input.projectId)
}

export async function updateTask(
  taskId: string,
  patch: {
    title?: string
    status?: TaskStatus
    assigneeId?: string | null
    priority?: TaskPriority
    dueDate?: string | null
    phaseId?: string | null
  }
) {
  const { supabase } = await requireAdminPage()

  const { data: task } = await supabase
    .from('ops_project_tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()
  if (!task) throw new Error('Task not found')
  if (patch.assigneeId) await assertStaffAssignee(supabase, patch.assigneeId)

  const updates: Database['public']['Tables']['ops_project_tasks']['Update'] = {
    updated_at: new Date().toISOString(),
  }
  if (patch.title !== undefined) updates.title = patch.title.trim()
  if (patch.status !== undefined) updates.status = patch.status
  if (patch.assigneeId !== undefined) updates.assignee_id = patch.assigneeId
  if (patch.priority !== undefined) updates.priority = patch.priority
  if (patch.dueDate !== undefined) updates.due_date = patch.dueDate
  if (patch.phaseId !== undefined) updates.phase_id = patch.phaseId

  const { error } = await supabase.from('ops_project_tasks').update(updates).eq('id', taskId)
  if (error) throw new Error(error.message)

  await supabase
    .from('ops_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', task.project_id)

  revalidateProjectPaths(task.project_id)
}

export async function getOfferProjectId(offerId: string) {
  const { supabase } = await requireAdminPage()
  return getProjectIdForOffer(supabase, offerId)
}

export async function listOfferProjectIds(offerIds: string[]) {
  const { supabase } = await requireAdminPage()
  if (!offerIds.length) return {} as Record<string, string>

  const { data } = await supabase
    .from('ops_projects')
    .select('id, financial_offer_id')
    .in('financial_offer_id', offerIds)
    .is('deleted_at', null)

  return Object.fromEntries(
    (data ?? [])
      .filter((p): p is { id: string; financial_offer_id: string } => !!p.financial_offer_id)
      .map(p => [p.financial_offer_id, p.id])
  )
}

export async function createPhase(projectId: string, name: string) {
  const { supabase } = await requireAdminPage()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Phase name is required')

  const { data: last } = await supabase
    .from('ops_project_phases')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('ops_project_phases').insert({
    project_id: projectId,
    name: trimmed,
    sort_order: (last?.sort_order ?? -1) + 1,
  })
  if (error) throw new Error(error.message)

  await supabase
    .from('ops_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId)

  revalidateProjectPaths(projectId)
}
