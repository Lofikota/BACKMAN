import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AttendanceClient from '../../admin/attendance/AttendanceClient'
import { format } from 'date-fns'

export default async function LeaderAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (!['leader', 'admin'].includes(profile?.role ?? '')) redirect('/member')

  const params = await searchParams
  const month = params.month || format(new Date(), 'yyyy-MM')
  const [year, mon] = month.split('-').map(Number)
  const from = `${month}-01`
  const to = `${month}-${new Date(year, mon, 0).getDate().toString().padStart(2, '0')}`

  const profileQuery = supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .eq('role', 'member')

  if (profile?.role === 'leader' && profile.team_id) {
    profileQuery.eq('team_id', profile.team_id)
  }

  const [{ data: profiles }, { data: reportTypes }, { data: reports }] = await Promise.all([
    profileQuery.order('name'),
    supabase.from('report_types').select('*').eq('is_active', true).order('order_index'),
    supabase
      .from('reports')
      .select('*, report_types(slug)')
      .gte('report_date', from)
      .lte('report_date', to),
  ])

  return (
    <AttendanceClient
      month={month}
      profiles={profiles || []}
      reportTypes={reportTypes || []}
      reports={reports || []}
    />
  )
}
