import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Report, ReportType, AttendanceRecord } from '@/lib/types'

export function buildAttendanceRecord(
  reports: Report[],
  reportTypes: ReportType[],
  userId: string,
  userName: string,
  date: string
): AttendanceRecord {
  const slugMap = Object.fromEntries(reportTypes.map(rt => [rt.id, rt.slug]))

  const bySlug = Object.fromEntries(
    reports
      .filter(r => r.report_date === date && r.user_id === userId)
      .map(r => [slugMap[r.report_type_id], r])
  )

  const wakeupTime = bySlug['wakeup']?.submitted_at
    ? format(parseISO(bySlug['wakeup'].submitted_at), 'HH:mm')
    : null
  const workStartTime = bySlug['work_start']?.submitted_at
    ? format(parseISO(bySlug['work_start'].submitted_at), 'HH:mm')
    : null
  const workEndTime = bySlug['work_end']?.submitted_at
    ? format(parseISO(bySlug['work_end'].submitted_at), 'HH:mm')
    : null

  let workHours: number | null = null
  if (workStartTime && workEndTime && bySlug['work_start'] && bySlug['work_end']) {
    const start = new Date(bySlug['work_start'].submitted_at).getTime()
    const end = new Date(bySlug['work_end'].submitted_at).getTime()
    workHours = Math.round(((end - start) / 3600000) * 10) / 10
  }

  const taskCount = reports.filter(
    r => r.report_date === date && r.user_id === userId && slugMap[r.report_type_id] === 'task_done'
  ).length

  return {
    date,
    user_id: userId,
    user_name: userName,
    wakeup_time: wakeupTime,
    work_start_time: workStartTime,
    work_end_time: workEndTime,
    work_hours: workHours,
    daily_report: !!bySlug['daily_report'],
    task_count: taskCount,
  }
}

export function exportAttendanceCSV(records: AttendanceRecord[]): string {
  const header = '日付,氏名,起床,業務開始,業務終了,稼働時間,日報,依頼完了数'
  const rows = records.map(r =>
    [
      r.date,
      r.user_name,
      r.wakeup_time ?? '-',
      r.work_start_time ?? '-',
      r.work_end_time ?? '-',
      r.work_hours != null ? `${r.work_hours}h` : '-',
      r.daily_report ? '○' : '×',
      r.task_count,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function formatDateJa(date: string): string {
  return format(parseISO(date), 'M月d日(EEE)', { locale: ja })
}
