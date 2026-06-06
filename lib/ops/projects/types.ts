export type ProjectTemplateKey = 'blank' | 'e_shop' | 'digital_ads' | 'email_marketing'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'

export type PhaseStatus = 'pending' | 'in_progress' | 'done'

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'

export type TaskPriority = 'low' | 'normal' | 'high'

export type ProjectTemplatePhase = {
  name: string
  tasks: string[]
}

export type ProjectTemplate = {
  key: ProjectTemplateKey
  label: string
  description: string
  phases: ProjectTemplatePhase[]
}

export type OpsProjectRecord = {
  id: string
  name: string
  clientId: string | null
  clientName: string | null
  isInternal: boolean
  financialOfferId: string | null
  templateKey: ProjectTemplateKey | null
  status: ProjectStatus
  leadId: string | null
  leadName: string | null
  description: string | null
  startDate: string | null
  targetDate: string | null
  costAmount: number | null
  createdAt: string
  updatedAt: string
  phaseCount: number
  taskCount: number
  doneTaskCount: number
}

export type OpsProjectPhase = {
  id: string
  projectId: string
  name: string
  sortOrder: number
  status: PhaseStatus
}

export type OpsProjectTask = {
  id: string
  projectId: string
  phaseId: string | null
  phaseName: string | null
  parentId: string | null
  title: string
  description: string | null
  status: TaskStatus
  assigneeId: string | null
  assigneeName: string | null
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
  subtasks: OpsProjectTask[]
}

export type OpsProjectDetail = OpsProjectRecord & {
  phases: OpsProjectPhase[]
  tasks: OpsProjectTask[]
}

export const TASK_STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
}

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high']

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}
