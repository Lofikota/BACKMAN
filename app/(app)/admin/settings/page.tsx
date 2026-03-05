import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin')

  const [{ data: reportTypes }, { data: teams }] = await Promise.all([
    supabase.from('report_types').select('*').order('order_index'),
    supabase.from('teams').select('*').order('name'),
  ])

  return <SettingsClient reportTypes={reportTypes || []} teams={teams || []} />
}
