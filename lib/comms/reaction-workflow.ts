export const COMMS_WORKFLOW_REACTIONS = ['eyes', 'white_check_mark', 'no_entry', 'hourglass'] as const

export type CommsWorkflowReaction = (typeof COMMS_WORKFLOW_REACTIONS)[number]

const WORKFLOW_LABELS: Record<CommsWorkflowReaction, string> = {
  eyes: 'is looking at this',
  white_check_mark: 'marked this handled',
  no_entry: 'marked this blocked',
  hourglass: 'marked this waiting',
}

export function workflowReactionLabel(type: string) {
  if (!(COMMS_WORKFLOW_REACTIONS as readonly string[]).includes(type)) return null
  return WORKFLOW_LABELS[type as CommsWorkflowReaction]
}
