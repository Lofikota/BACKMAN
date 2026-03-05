'use client'

import { useState } from 'react'
import ReportCard from './ReportCard'
import type { ReportType, Report } from '@/lib/types'

interface Props {
  reportTypes: ReportType[]
  initialReportMap: Record<string, Report>
  userId: string
}

export default function ReportHomeClient({ reportTypes, initialReportMap, userId }: Props) {
  const [reportMap, setReportMap] = useState<Record<string, Report>>(initialReportMap)

  const handleSubmit = async (reportTypeId: string, content: string) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_type_id: reportTypeId, content }),
    })

    if (res.ok) {
      const { report, slug } = await res.json()
      setReportMap(prev => ({ ...prev, [slug]: report }))
    }
  }

  return (
    <div className="space-y-4">
      {reportTypes.map(rt => (
        <ReportCard
          key={rt.id}
          reportType={rt}
          todayReport={reportMap[rt.slug] ?? null}
          onSubmit={handleSubmit}
        />
      ))}
    </div>
  )
}
