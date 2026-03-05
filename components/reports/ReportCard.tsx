'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { Report, ReportType } from '@/lib/types'

interface ReportCardProps {
  reportType: ReportType
  todayReport: Report | null
  onSubmit: (reportTypeId: string, content: string) => Promise<void>
}

export default function ReportCard({ reportType, todayReport, onSubmit }: ReportCardProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const needsContent = reportType.slug === 'task_done' || reportType.slug === 'daily_report'

  const isOverdue = () => {
    if (!reportType.deadline_time || todayReport) return false
    const now = new Date()
    const [h, m] = reportType.deadline_time.split(':').map(Number)
    const deadline = new Date()
    deadline.setHours(h, m, 0, 0)
    return now > deadline
  }

  const handleSubmit = async () => {
    if (needsContent && !content.trim()) return
    setLoading(true)
    await onSubmit(reportType.id, content)
    setContent('')
    setLoading(false)
  }

  const overdue = isOverdue()

  return (
    <Card className={`transition-all ${todayReport ? 'border-green-200 bg-green-50' : overdue ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{reportType.name}</CardTitle>
          {todayReport ? (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              提出済
            </Badge>
          ) : overdue ? (
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              遅延
            </Badge>
          ) : reportType.deadline_time ? (
            <Badge variant="outline" className="text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {reportType.deadline_time.slice(0, 5)}まで
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {todayReport ? (
          <div className="text-sm text-gray-600">
            {todayReport.content && (
              <p className="mb-1 text-gray-800">{todayReport.content}</p>
            )}
            <p className="text-xs text-gray-400">
              {format(new Date(todayReport.submitted_at), 'HH:mm')} に提出
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {needsContent && (
              <Textarea
                placeholder={
                  reportType.slug === 'task_done'
                    ? '完了した業務内容を入力してください...'
                    : '今日の業務サマリを入力してください...'
                }
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={3}
              />
            )}
            <Button
              onClick={handleSubmit}
              disabled={loading || (needsContent && !content.trim())}
              className="w-full"
              variant={overdue ? 'destructive' : 'default'}
            >
              {loading ? '送信中...' : reportType.slug === 'task_done' ? '依頼完了を報告' : `${reportType.name}を提出`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
