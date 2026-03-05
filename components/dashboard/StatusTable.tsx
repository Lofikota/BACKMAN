'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle, Minus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Profile, Report, ReportType } from '@/lib/types'

interface Props {
  profiles: Profile[]
  reportTypes: ReportType[]
  reports: Report[]
}

export default function StatusTable({ profiles, reportTypes, reports }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const getReport = (userId: string, slug: string) =>
    reports.find(
      r => r.user_id === userId &&
        r.report_date === today &&
        (r as Report & { report_types?: { slug: string } }).report_types?.slug === slug
    )

  const isOverdue = (rt: ReportType) => {
    if (!rt.deadline_time) return false
    const now = new Date()
    const [h, m] = rt.deadline_time.split(':').map(Number)
    const deadline = new Date()
    deadline.setHours(h, m, 0, 0)
    return now > deadline
  }

  const getStatusBadge = (report: Report | undefined, rt: ReportType) => {
    if (report) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-xs">
          <CheckCircle className="h-3.5 w-3.5" />
          {format(parseISO(report.submitted_at), 'HH:mm')}
        </span>
      )
    }
    if (rt.slug === 'task_done') {
      return <Minus className="h-3.5 w-3.5 text-gray-300" />
    }
    if (isOverdue(rt)) {
      return (
        <span className="flex items-center gap-1 text-red-500 text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          未提出
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-gray-400 text-xs">
        <Clock className="h-3.5 w-3.5" />
        待機中
      </span>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left py-3 px-4 font-medium text-gray-600">メンバー</th>
            {reportTypes.map(rt => (
              <th key={rt.id} className="text-center py-3 px-3 font-medium text-gray-600 whitespace-nowrap">
                {rt.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map(profile => (
            <tr key={profile.id} className="border-b hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 font-medium">{profile.name}</td>
              {reportTypes.map(rt => (
                <td key={rt.id} className="py-3 px-3 text-center">
                  {rt.slug === 'task_done' ? (
                    <span className="text-xs text-gray-500">
                      {reports.filter(
                        r => r.user_id === profile.id &&
                          r.report_date === today &&
                          (r as Report & { report_types?: { slug: string } }).report_types?.slug === 'task_done'
                      ).length}件
                    </span>
                  ) : (
                    getStatusBadge(getReport(profile.id, rt.slug), rt)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
