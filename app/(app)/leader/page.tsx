import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import StatusTable from '@/components/dashboard/StatusTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile, ReportType, Report } from '@/lib/types'

export default async function LeaderDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['leader', 'admin'].includes(profile.role)) redirect('/member')

  const today = format(new Date(), 'yyyy-MM-dd')

  const query = supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('is_active', true)
    .eq('role', 'member')

  if (profile.role === 'leader' && profile.team_id) {
    query.eq('team_id', profile.team_id)
  }

  const [{ data: members }, { data: reportTypes }, { data: todayReports }] = await Promise.all([
    query.order('name'),
    supabase.from('report_types').select('*').eq('is_active', true).order('order_index'),
    supabase
      .from('reports')
      .select('*, report_types(slug)')
      .eq('report_date', today),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">チームダッシュボード</h2>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'yyyy年M月d日(EEE)', { locale: ja })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            本日の報告状況
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({members?.length ?? 0}名)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StatusTable
            profiles={(members || []) as Profile[]}
            reportTypes={(reportTypes || []) as ReportType[]}
            reports={(todayReports || []) as Report[]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
