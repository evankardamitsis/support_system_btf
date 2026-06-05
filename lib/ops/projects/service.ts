import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getProjectTemplate } from './templates'
import type {
  OpsProjectDetail,
  OpsProjectPhase,
  OpsProjectRecord,
  OpsProjectTask,
  ProjectTemplateKey,
  TaskStatus,
} from './types'

type Db = SupabaseClient<Database>

type ProjectRow = Database['public']['Tables']['ops_projects']['Row']
type TaskRow = Database['public']['Tables']['ops_project_tasks']['Row']

async function loadStaffNames(supabase: Db, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, string>()

  const { data } = await supabase.from('users').select('id, full_name').in('id', unique)
  return new Map((data ?? []).map(u => [u.id, u.full_name ?? '']))
}

function mapProjectRow(
  row: ProjectRow & { clients?: { name: string } | null },
  counts: { phases: number; tasks: number; done: number },
  leadName: string | null
): OpsProjectRecord {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.is_internal ? 'Internal' : row.clients?.name ?? null,
    isInternal: row.is_internal,
    financialOfferId: row.financial_offer_id,
    templateKey: row.template_key as OpsProjectRecord['templateKey'],
    status: row.status as OpsProjectRecord['status'],
    leadId: row.lead_id,
    leadName,
    description: row.description,
    startDate: row.start_date,
    targetDate: row.target_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    phaseCount: counts.phases,
    taskCount: counts.tasks,
    doneTaskCount: counts.done,
  }
}

async function loadProjectCounts(supabase: Db, projectIds: string[]) {
  const counts = new Map<string, { phases: number; tasks: number; done: number }>()
  for (const id of projectIds) counts.set(id, { phases: 0, tasks: 0, done: 0 })
  if (!projectIds.length) return counts

  const [{ data: phases }, { data: tasks }] = await Promise.all([
    supabase.from('ops_project_phases').select('project_id').in('project_id', projectIds),
    supabase.from('ops_project_tasks').select('project_id, status').in('project_id', projectIds),
  ])

  for (const p of phases ?? []) {
    const c = counts.get(p.project_id)!
    c.phases += 1
  }
  for (const t of tasks ?? []) {
    const c = counts.get(t.project_id)!
    c.tasks += 1
    if (t.status === 'done') c.done += 1
  }

  return counts
}

function nestTasks(
  rows: Array<
    TaskRow & {
      phase: { name: string } | null
    }
  >,
  staffNames: Map<string, string>
): OpsProjectTask[] {
  const mapped = rows.map(row => ({
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id,
    phaseName: row.phase?.name ?? null,
    parentId: row.parent_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_id ? staffNames.get(row.assignee_id) ?? null : null,
    priority: row.priority as OpsProjectTask['priority'],
    dueDate: row.due_date,
    sortOrder: row.sort_order,
    subtasks: [] as OpsProjectTask[],
  }))

  const byId = new Map(mapped.map(t => [t.id, t]))
  const roots: OpsProjectTask[] = []

  for (const task of mapped) {
    if (task.parentId && byId.has(task.parentId)) {
      byId.get(task.parentId)!.subtasks.push(task)
    } else if (!task.parentId) {
      roots.push(task)
    }
  }

  return roots
}

export async function applyProjectTemplate(
  supabase: Db,
  projectId: string,
  templateKey: ProjectTemplateKey
) {
  const template = getProjectTemplate(templateKey)
  if (!template.phases.length) return

  for (let phaseIndex = 0; phaseIndex < template.phases.length; phaseIndex++) {
    const phaseDef = template.phases[phaseIndex]
    const { data: phase, error: phaseError } = await supabase
      .from('ops_project_phases')
      .insert({
        project_id: projectId,
        name: phaseDef.name,
        sort_order: phaseIndex,
      })
      .select('id')
      .single()

    if (phaseError || !phase) throw new Error(phaseError?.message ?? 'Could not create phase')

    if (phaseDef.tasks.length) {
      const { error: taskError } = await supabase.from('ops_project_tasks').insert(
        phaseDef.tasks.map((title, taskIndex) => ({
          project_id: projectId,
          phase_id: phase.id,
          title,
          sort_order: taskIndex,
        }))
      )
      if (taskError) throw new Error(taskError.message)
    }
  }
}

export async function listOpsProjects(supabase: Db): Promise<OpsProjectRecord[]> {
  const { data, error } = await supabase
    .from('ops_projects')
    .select('*, clients(name)')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  const ids = data.map(p => p.id)
  const counts = await loadProjectCounts(supabase, ids)
  const staffNames = await loadStaffNames(
    supabase,
    data.map(p => p.lead_id).filter((id): id is string => !!id)
  )

  return data.map(row =>
    mapProjectRow(
      row,
      counts.get(row.id) ?? { phases: 0, tasks: 0, done: 0 },
      row.lead_id ? staffNames.get(row.lead_id) ?? null : null
    )
  )
}

export async function getOpsProjectDetail(
  supabase: Db,
  projectId: string
): Promise<OpsProjectDetail | null> {
  const { data: project, error } = await supabase
    .from('ops_projects')
    .select('*, clients(name)')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (error || !project) return null

  const [{ data: phases }, { data: tasks }] = await Promise.all([
    supabase
      .from('ops_project_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('ops_project_tasks')
      .select('*, phase:ops_project_phases(name)')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
  ])

  const phaseList: OpsProjectPhase[] = (phases ?? []).map(p => ({
    id: p.id,
    projectId: p.project_id,
    name: p.name,
    sortOrder: p.sort_order,
    status: p.status as OpsProjectPhase['status'],
  }))

  const assigneeIds = (tasks ?? []).map(t => t.assignee_id).filter((id): id is string => !!id)
  const staffNames = await loadStaffNames(supabase, [
    ...(project.lead_id ? [project.lead_id] : []),
    ...assigneeIds,
  ])

  const taskList = nestTasks(tasks ?? [], staffNames)
  const flatCount = tasks?.length ?? 0
  const doneCount = tasks?.filter(t => t.status === 'done').length ?? 0

  return {
    ...mapProjectRow(
      project,
      { phases: phaseList.length, tasks: flatCount, done: doneCount },
      project.lead_id ? staffNames.get(project.lead_id) ?? null : null
    ),
    phases: phaseList,
    tasks: taskList,
  }
}

export async function getProjectIdForOffer(supabase: Db, offerId: string) {
  const { data } = await supabase
    .from('ops_projects')
    .select('id')
    .eq('financial_offer_id', offerId)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.id ?? null
}
