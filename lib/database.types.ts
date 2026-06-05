// Auto-generated placeholder — replace by running:
// npx supabase gen types typescript --linked > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: 'admin' | 'agent' | 'client'
          client_id: string | null
          full_name: string | null
          portal_onboarding_completed_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'admin' | 'agent' | 'client'
          client_id?: string | null
          full_name?: string | null
          portal_onboarding_completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'agent' | 'client'
          client_id?: string | null
          full_name?: string | null
          portal_onboarding_completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string
          contact_name: string | null
          plan_name: string | null
          billing_cycle_day: number
          renewal_date: string | null
          retainer_status: 'active' | 'frozen' | 'canceled'
          retainer_frozen_at: string | null
          retainer_canceled_at: string | null
          sla_response_hours: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          contact_name?: string | null
          plan_name?: string | null
          billing_cycle_day?: number
          renewal_date?: string | null
          retainer_status?: 'active' | 'frozen' | 'canceled'
          retainer_frozen_at?: string | null
          retainer_canceled_at?: string | null
          sla_response_hours?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          contact_name?: string | null
          plan_name?: string | null
          billing_cycle_day?: number
          renewal_date?: string | null
          retainer_status?: 'active' | 'frozen' | 'canceled'
          retainer_frozen_at?: string | null
          retainer_canceled_at?: string | null
          sla_response_hours?: number
          created_at?: string
        }
        Relationships: []
      }
      retainers: {
        Row: {
          id: string
          client_id: string
          package_name: string
          period_start: string
          period_end: string
          hours_total: number
          hours_used: number
          period_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          package_name?: string
          period_start: string
          period_end: string
          hours_total: number
          hours_used?: number
          period_cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          package_name?: string
          period_start?: string
          period_end?: string
          hours_total?: number
          hours_used?: number
          period_cost?: number
          created_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string
          client_id: string
          created_by: string
          assigned_to: string | null
          title: string
          description: string | null
          status: 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed'
          priority: 'low' | 'normal' | 'high' | 'critical'
          type: 'bug' | 'task' | 'request' | 'question'
          created_at: string
          updated_at: string
          resolved_at: string | null
          estimated_hours: number | null
          actual_hours: number | null
          estimate_status: 'pending_approval' | 'approved' | null
          estimate_submitted_at: string | null
          estimate_approved_at: string | null
          completion_status: 'pending_approval' | 'approved' | null
          completion_submitted_at: string | null
          completion_approved_at: string | null
          completion_dispute_note: string | null
          completion_disputed_at: string | null
          extra_hours_active_at: string | null
          hours_overage_note: string | null
        }
        Insert: {
          id?: string
          client_id: string
          created_by: string
          assigned_to?: string | null
          title: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed'
          priority?: 'low' | 'normal' | 'high' | 'critical'
          type?: 'bug' | 'task' | 'request' | 'question'
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          estimate_status?: 'pending_approval' | 'approved' | null
          estimate_submitted_at?: string | null
          estimate_approved_at?: string | null
          completion_status?: 'pending_approval' | 'approved' | null
          completion_submitted_at?: string | null
          completion_approved_at?: string | null
          completion_dispute_note?: string | null
          completion_disputed_at?: string | null
          extra_hours_active_at?: string | null
          hours_overage_note?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          created_by?: string
          assigned_to?: string | null
          title?: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed'
          priority?: 'low' | 'normal' | 'high' | 'critical'
          type?: 'bug' | 'task' | 'request' | 'question'
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          estimate_status?: 'pending_approval' | 'approved' | null
          estimate_submitted_at?: string | null
          estimate_approved_at?: string | null
          completion_status?: 'pending_approval' | 'approved' | null
          completion_submitted_at?: string | null
          completion_approved_at?: string | null
          completion_dispute_note?: string | null
          completion_disputed_at?: string | null
          extra_hours_active_at?: string | null
          hours_overage_note?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          id: string
          ticket_id: string
          author_id: string
          body: string
          is_internal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          author_id: string
          body: string
          is_internal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          author_id?: string
          body?: string
          is_internal?: boolean
          created_at?: string
        }
        Relationships: []
      }
      hours_log: {
        Row: {
          id: string
          ticket_id: string
          retainer_id: string
          agent_id: string
          minutes: number
          note: string | null
          logged_at: string
          is_extra: boolean
        }
        Insert: {
          id?: string
          ticket_id: string
          retainer_id: string
          agent_id: string
          minutes: number
          note?: string | null
          logged_at?: string
          is_extra?: boolean
        }
        Update: {
          id?: string
          ticket_id?: string
          retainer_id?: string
          agent_id?: string
          minutes?: number
          note?: string | null
          logged_at?: string
          is_extra?: boolean
        }
        Relationships: []
      }
      ticket_extra_hours: {
        Row: {
          id: string
          ticket_id: string
          retainer_id: string
          agent_id: string
          minutes: number
          note: string | null
          status: 'pending_approval' | 'approved'
          submitted_at: string
          approved_at: string | null
          hours_log_id: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          retainer_id: string
          agent_id: string
          minutes: number
          note?: string | null
          status?: 'pending_approval' | 'approved'
          submitted_at?: string
          approved_at?: string | null
          hours_log_id?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          retainer_id?: string
          agent_id?: string
          minutes?: number
          note?: string | null
          status?: 'pending_approval' | 'approved'
          submitted_at?: string
          approved_at?: string | null
          hours_log_id?: string | null
        }
        Relationships: []
      }
      invite_tokens: {
        Row: {
          id: string
          client_id: string
          token: string
          used: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          token?: string
          used?: boolean
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          token?: string
          used?: boolean
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      staff_invite_tokens: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'agent'
          token: string
          used: boolean
          expires_at: string
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: 'admin' | 'agent'
          token?: string
          used?: boolean
          expires_at?: string
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'agent'
          token?: string
          used?: boolean
          expires_at?: string
          invited_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
