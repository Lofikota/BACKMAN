import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import StatusTable from '@/components/dashboard/StatusTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { Profile, ReportType, Report } from '@/lib/types'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'leader'].includes(profile.role)) redirect('/member')

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: profiles }, { data: reportTypes }, { data: todayReports }, { data: reminderLogs }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('*, teams(name)')
        .eq('is_active', true)
        .eq('role', 'member')
        .order('name'),
      supabase
        .from('report_types')
        .select('*')
        .eq('is_active', true)
        .order('order_index'),
      supabase
        .from('reports')
        .select('*, report_types(slug, name)')
        .eq('report_date', today),
      supabase
        .from('reminder_logs')
        .select('*, profiles(name), report_types(name)')
        .gte('sent_at', today + 'T00:00:00')
        .order('sent_at', { ascending: false })
        .limit(20),
    ])

  const memberCount = profiles?.length ?? 0
  const completedToday = new Set(todayReports?.map(r => r.user_id)).size
  const overdueTypes = (reportTypes || []).filter(rt => {
    if (!rt.deadline_time) return false
    const now = new Date()
    const [h, m] = rt.deadline_time.split(':').map(Number)
    const deadline = new Date()
    deadline.setHours(h, m, 0, 0)
    return now > deadline
  })

  const overdueMembers = (profiles || []).filter(p =>
    overdueTypes.some(rt =>
      !(todayReports || []).some(
        r => r.user_id === p.id &&
          (r as Report & { report_types?: { slug: string } }).report_types?.slug === rt.slug
      )
    )
  ).length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'yyyy年M月d日(EEE)', { locale: ja })}
        </p>
      </div>

      {/* サマリカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-xs text-gray-500">メンバー数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{completedToday}</p>
              <p className="text-xs text-gray-500">稼働中</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{overdueMembers}</p>
              <p className="text-xs text-gray-500">遅延メンバー</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{reminderLogs?.length ?? 0}</p>
              <p className="text-xs text-gray-500">本日のリマインド</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 報告状況テーブル */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">本日の報告状況</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StatusTable
            profiles={(profiles || []) as Profile[]}
            reportTypes={(reportTypes || []) as ReportType[]}
            reports={(todayReports || []) as Report[]}
          />
        </CardContent>
      </Card>

      {/* リマインドログ */}
      {reminderLogs && reminderLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本日のリマインドログ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reminderLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>
                    <span className="font-medium">{(log.profiles as { name: string })?.name}</span>
                    　{(log.report_types as { name: string })?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      {log.reminder_count}回目
                    </span>
                    {log.escalated_at && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        エスカレ済
                      </span>
                    )}
                    <span className="text-gray-400 text-xs">
                      {format(new Date(log.sent_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
