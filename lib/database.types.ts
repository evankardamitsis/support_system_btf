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
          approval_reminders_enabled: boolean
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
          approval_reminders_enabled?: boolean
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
          approval_reminders_enabled?: boolean
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
          hours_limited: boolean
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
          hours_limited?: boolean
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
          hours_limited?: boolean
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
          status: 'open' | 'in_progress' | 'waiting_on_client' | 'on_hold' | 'resolved' | 'closed'
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
          approval_reminder_count: number
          approval_reminder_sent_at: string | null
          on_hold_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          created_by: string
          assigned_to?: string | null
          title: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'waiting_on_client' | 'on_hold' | 'resolved' | 'closed'
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
          approval_reminder_count?: number
          approval_reminder_sent_at?: string | null
          on_hold_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          created_by?: string
          assigned_to?: string | null
          title?: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'waiting_on_client' | 'on_hold' | 'resolved' | 'closed'
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
          approval_reminder_count?: number
          approval_reminder_sent_at?: string | null
          on_hold_at?: string | null
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
          reminder_count: number
          reminder_sent_at: string | null
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
          reminder_count?: number
          reminder_sent_at?: string | null
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
          reminder_count?: number
          reminder_sent_at?: string | null
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
      client_invite_tokens: {
        Row: {
          id: string
          client_id: string
          email: string
          full_name: string
          token: string
          used: boolean
          expires_at: string
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          email: string
          full_name: string
          token?: string
          used?: boolean
          expires_at?: string
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          email?: string
          full_name?: string
          token?: string
          used?: boolean
          expires_at?: string
          invited_by?: string | null
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
      company_profile: {
        Row: {
          id: string
          name: string
          address: string
          mobile: string
          phone: string
          email: string
          upfront_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          name?: string
          address?: string
          mobile?: string
          phone?: string
          email?: string
          upfront_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          mobile?: string
          phone?: string
          email?: string
          upfront_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_ibans: {
        Row: {
          id: string
          bank_name: string
          iban: string
          swift_bic: string
          label: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          bank_name: string
          iban: string
          swift_bic: string
          label?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          bank_name?: string
          iban?: string
          swift_bic?: string
          label?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      ops_hosting_contracts: {
        Row: {
          id: string
          name: string
          client_id: string
          period_type: 'month' | '3month' | '6month' | 'year'
          custom_period: string | null
          cost_amount: number
          period_start: string
          period_end: string
          status: 'active' | 'expired' | 'canceled'
          renewal_notified_at: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          client_id: string
          period_type?: 'month' | '3month' | '6month' | 'year'
          custom_period?: string | null
          cost_amount: number
          period_start: string
          period_end: string
          status?: 'active' | 'expired' | 'canceled'
          renewal_notified_at?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          client_id?: string
          period_type?: 'month' | '3month' | '6month' | 'year'
          custom_period?: string | null
          cost_amount?: number
          period_start?: string
          period_end?: string
          status?: 'active' | 'expired' | 'canceled'
          renewal_notified_at?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ops_hosting_contracts_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      ops_notifications: {
        Row: {
          id: string
          user_id: string
          type:
            | 'task_assigned'
            | 'task_due'
            | 'task_overdue'
            | 'offer_accepted'
            | 'hosting_renewal'
            | 'project_completed'
          title: string
          body: string | null
          href: string
          dedupe_key: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type:
            | 'task_assigned'
            | 'task_due'
            | 'task_overdue'
            | 'offer_accepted'
            | 'hosting_renewal'
            | 'project_completed'
          title: string
          body?: string | null
          href: string
          dedupe_key?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?:
            | 'task_assigned'
            | 'task_due'
            | 'task_overdue'
            | 'offer_accepted'
            | 'hosting_renewal'
            | 'project_completed'
          title?: string
          body?: string | null
          href?: string
          dedupe_key?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ops_project_files: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          storage_path: string
          file_name: string
          mime_type: string | null
          size_bytes: number
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          storage_path: string
          file_name: string
          mime_type?: string | null
          size_bytes?: number
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          size_bytes?: number
          uploaded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ops_project_files_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'ops_projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ops_project_files_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'ops_project_tasks'
            referencedColumns: ['id']
          },
        ]
      }
      ops_project_task_comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          author_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ops_project_task_comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'ops_project_tasks'
            referencedColumns: ['id']
          },
        ]
      }
      ops_project_phases: {
        Row: {
          id: string
          project_id: string
          name: string
          sort_order: number
          status: 'pending' | 'in_progress' | 'done'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          sort_order?: number
          status?: 'pending' | 'in_progress' | 'done'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          sort_order?: number
          status?: 'pending' | 'in_progress' | 'done'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ops_project_phases_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'ops_projects'
            referencedColumns: ['id']
          },
        ]
      }
      ops_project_tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          parent_id: string | null
          title: string
          description: string | null
          status: 'backlog' | 'in_progress' | 'review' | 'done'
          assignee_id: string | null
          priority: 'low' | 'normal' | 'high'
          due_date: string | null
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          parent_id?: string | null
          title: string
          description?: string | null
          status?: 'backlog' | 'in_progress' | 'review' | 'done'
          assignee_id?: string | null
          priority?: 'low' | 'normal' | 'high'
          due_date?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          phase_id?: string | null
          parent_id?: string | null
          title?: string
          description?: string | null
          status?: 'backlog' | 'in_progress' | 'review' | 'done'
          assignee_id?: string | null
          priority?: 'low' | 'normal' | 'high'
          due_date?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ops_project_tasks_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'ops_project_tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ops_project_tasks_phase_id_fkey'
            columns: ['phase_id']
            isOneToOne: false
            referencedRelation: 'ops_project_phases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ops_project_tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'ops_projects'
            referencedColumns: ['id']
          },
        ]
      }
      ops_projects: {
        Row: {
          id: string
          name: string
          client_id: string | null
          is_internal: boolean
          financial_offer_id: string | null
          template_key: 'blank' | 'e_shop' | 'digital_ads' | 'email_marketing' | null
          status: 'active' | 'on_hold' | 'completed' | 'archived'
          lead_id: string | null
          description: string | null
          start_date: string | null
          target_date: string | null
          cost_amount: number | null
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          client_id?: string | null
          is_internal?: boolean
          financial_offer_id?: string | null
          template_key?: 'blank' | 'e_shop' | 'digital_ads' | 'email_marketing' | null
          status?: 'active' | 'on_hold' | 'completed' | 'archived'
          lead_id?: string | null
          description?: string | null
          start_date?: string | null
          target_date?: string | null
          cost_amount?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          client_id?: string | null
          is_internal?: boolean
          financial_offer_id?: string | null
          template_key?: 'blank' | 'e_shop' | 'digital_ads' | 'email_marketing' | null
          status?: 'active' | 'on_hold' | 'completed' | 'archived'
          lead_id?: string | null
          description?: string | null
          start_date?: string | null
          target_date?: string | null
          cost_amount?: number | null
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ops_projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ops_projects_financial_offer_id_fkey'
            columns: ['financial_offer_id']
            isOneToOne: true
            referencedRelation: 'financial_offers'
            referencedColumns: ['id']
          },
        ]
      }
      financial_offers: {
        Row: {
          id: string
          client_id: string | null
          client_name: string
          client_email: string | null
          line_items: Json
          hosting_maintenance: string | null
          ibans: Json
          upfront_percent: number
          total_amount: number
          upfront_amount: number
          exclude_vat: boolean
          status: 'open' | 'accepted'
          accepted_at: string | null
          accepted_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          emailed_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          client_name: string
          client_email?: string | null
          line_items?: Json
          hosting_maintenance?: string | null
          ibans?: Json
          upfront_percent: number
          total_amount: number
          upfront_amount: number
          exclude_vat?: boolean
          status?: 'open' | 'accepted'
          accepted_at?: string | null
          accepted_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          emailed_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          client_name?: string
          client_email?: string | null
          line_items?: Json
          hosting_maintenance?: string | null
          ibans?: Json
          upfront_percent?: number
          total_amount?: number
          upfront_amount?: number
          exclude_vat?: boolean
          status?: 'open' | 'accepted'
          accepted_at?: string | null
          accepted_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          emailed_at?: string | null
          created_by?: string
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
