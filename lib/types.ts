import type { Database } from './database.types'

export type User = Database['public']['Tables']['users']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Retainer = Database['public']['Tables']['retainers']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type TicketComment = Database['public']['Tables']['ticket_comments']['Row']
export type HoursLog = Database['public']['Tables']['hours_log']['Row']
export type TicketExtraHours = Database['public']['Tables']['ticket_extra_hours']['Row']
export type InviteToken = Database['public']['Tables']['invite_tokens']['Row']

export type TicketStatus = Ticket['status']
export type TicketPriority = Ticket['priority']
export type TicketType = Ticket['type']
export type UserRole = User['role']

export interface TicketWithClient extends Ticket {
  client: Pick<Client, 'id' | 'name'>
}

export interface RetainerWithUsage extends Retainer {
  hours_remaining: number
  usage_percent: number
}
