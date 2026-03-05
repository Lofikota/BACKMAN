'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO, eachDayOfInterval, parseISO as pi } from 'date-fns'
import { ja } from 'date-fns/locale'
import { buildAttendanceRecord, exportAttendanceCSV } from '@/lib/utils/attendance'
import type { Profile, ReportType, Report } from '@/lib/types'

interface Props {
  month: string
  profiles: Profile[]
  reportTypes: ReportType[]
  reports: Report[]
}

export default function AttendanceClient({ month, profiles, reportTypes, reports }: Props) {
  const router = useRouter()
  const [year, mon] = month.split('-').map(Number)

  const days = eachDayOfInterval({
    start: new Date(year, mon - 1, 1),
    end: new Date(year, mon, 0),
  })

  const changeMonth = (delta: number) => {
    const d = new Date(year, mon - 1 + delta, 1)
    router.push(`/admin/attendance?month=${format(d, 'yyyy-MM')}`)
  }

  const allRecords = profiles.flatMap(p =>
    days.map(d => buildAttendanceRecord(
      reports as Report[],
      reportTypes,
      p.id,
      p.name,
      format(d, 'yyyy-MM-dd')
    ))
  )

  const handleDownload = () => {
    const csv = exportAttendanceCSV(allRecords)
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `出勤簿_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">出勤簿</h2>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => changeMonth(-1)} className="p-1 rounded hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium">
              {format(new Date(year, mon - 1, 1), 'yyyy年M月', { locale: ja })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 rounded hover:bg-gray-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          CSVダウンロード
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left sticky left-0 bg-gray-50 z-10 min-w-24">氏名</th>
              {days.map(d => (
                <th key={d.toISOString()} className="border px-2 py-2 text-center min-w-14">
                  <div>{format(d, 'd')}</div>
                  <div className={`text-xs ${[0,6].includes(d.getDay()) ? 'text-red-400' : 'text-gray-400'}`}>
                    {format(d, 'EEE', { locale: ja })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2 font-medium sticky left-0 bg-white z-10">{p.name}</td>
                {days.map(d => {
                  const dateStr = format(d, 'yyyy-MM-dd')
                  const rec = buildAttendanceRecord(
                    reports as Report[],
                    reportTypes,
                    p.id,
                    p.name,
                    dateStr
                  )
                  const isWeekend = [0, 6].includes(d.getDay())
                  return (
                    <td key={d.toISOString()}
                      className={`border px-1 py-1 text-center ${isWeekend ? 'bg-gray-50' : ''}`}
                    >
                      {rec.work_start_time && rec.work_end_time ? (
                        <div className="text-green-600">
                          <div>{rec.work_start_time}</div>
                          <div>{rec.work_end_time}</div>
                          <div className="text-gray-400">{rec.work_hours}h</div>
                        </div>
                      ) : rec.work_start_time ? (
                        <div className="text-blue-500">
                          <div>{rec.work_start_time}</div>
                          <div className="text-gray-300">-</div>
                        </div>
                      ) : (
                        <span className="text-gray-200">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
