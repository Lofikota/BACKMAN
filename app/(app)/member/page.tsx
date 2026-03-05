import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportCard from '@/components/reports/ReportCard'
import ReportHomeClient from '@/components/reports/ReportHomeClient'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { ReportType, Report } from '@/lib/types'

export default async function MemberPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: reportTypes }, { data: todayReports }] = await Promise.all([
    supabase
      .from('report_types')
      .select('*')
      .eq('is_active', true)
      .order('order_index'),
    supabase
      .from('reports')
      .select('*, report_types(slug)')
      .eq('user_id', user.id)
      .eq('report_date', today),
  ])

  const reportMap = Object.fromEntries(
    (todayReports || []).map(r => [r.report_types?.slug, r])
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">今日の報告</h2>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'yyyy年M月d日(EEE)', { locale: ja })}
        </p>
      </div>

      <ReportHomeClient
        reportTypes={reportTypes as ReportType[]}
        initialReportMap={reportMap as Record<string, Report>}
        userId={user.id}
      />
    </div>
  )
}
