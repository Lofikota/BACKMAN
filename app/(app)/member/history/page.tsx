import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format, subDays, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle } from 'lucide-react'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [{ data: reportTypes }, { data: reports }] = await Promise.all([
    supabase.from('report_types').select('*').eq('is_active', true).order('order_index'),
    supabase
      .from('reports')
      .select('*, report_types(slug, name)')
      .eq('user_id', user.id)
      .gte('report_date', since)
      .order('report_date', { ascending: false })
      .order('submitted_at'),
  ])

  // 日付ごとにグループ化
  const grouped: Record<string, typeof reports> = {}
  for (const r of reports || []) {
    if (!grouped[r.report_date]) grouped[r.report_date] = []
    grouped[r.report_date]!.push(r)
  }

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">報告履歴（過去30日）</h2>

      {dates.length === 0 ? (
        <p className="text-gray-500">報告履歴がありません。</p>
      ) : (
        <div className="space-y-6">
          {dates.map(date => {
            const dayReports = grouped[date]!
            const slugs = dayReports.map(r => r.report_types?.slug)
            return (
              <div key={date} className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-gray-900 mb-3">
                  {format(parseISO(date), 'M月d日(EEE)', { locale: ja })}
                </h3>
                <div className="space-y-2">
                  {(reportTypes || []).map(rt => {
                    const report = dayReports.find(r => r.report_types?.slug === rt.slug)
                    return (
                      <div key={rt.id} className="flex items-start gap-3 text-sm">
                        {report ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className={report ? 'text-gray-800' : 'text-gray-400'}>
                            {rt.name}
                          </span>
                          {report && (
                            <span className="text-gray-400 ml-2">
                              {format(parseISO(report.submitted_at), 'HH:mm')}
                            </span>
                          )}
                          {report?.content && (
                            <p className="text-gray-600 mt-0.5 text-xs truncate">{report.content}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
