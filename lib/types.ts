export type Role = 'member' | 'leader' | 'admin'

export type ReportSlug = 'wakeup' | 'work_start' | 'task_done' | 'work_end' | 'daily_report'

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  team_id: string | null
  is_active: boolean
  created_at: string
  teams?: Team
}

export interface Invitation {
  id: string
  email: string
  name: string
  role: Role
  team_id: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  created_by: string
  created_at: string
}

export interface ReportType {
  id: string
  name: string
  slug: ReportSlug
  deadline_time: string | null
  order_index: number
  is_active: boolean
}

export interface Report {
  id: string
  user_id: string
  report_type_id: string
  content: string | null
  report_date: string
  submitted_at: string
  report_types?: ReportType
  profiles?: Profile
}

export interface ReminderLog {
  id: string
  user_id: string
  report_type_id: string
  reminder_count: number
  sent_at: string
  escalated_at: string | null
  profiles?: Profile
  report_types?: ReportType
}

export interface KnowledgeItem {
  id: string
  source_type: 'report' | 'manual'
  title: string
  content: string
  report_id: string | null
  created_by: string | null
  created_at: string
}

export interface DailyStatus {
  profile: Profile
  reports: Record<ReportSlug, Report | null>
  hasOverdue: boolean
}

export interface AttendanceRecord {
  date: string
  user_id: string
  user_name: string
  wakeup_time: string | null
  work_start_time: string | null
  work_end_time: string | null
  work_hours: number | null
  daily_report: boolean
  task_count: number
}
