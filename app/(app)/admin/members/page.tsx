import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/admin')

  const [{ data: profiles }, { data: teams }, { data: pendingInvites }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, teams(name)')
      .eq('is_active', true)
      .order('name'),
    supabase.from('teams').select('*').order('name'),
    supabase
      .from('invitations')
      .select('*')
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  return (
    <MembersClient
      profiles={profiles || []}
      teams={teams || []}
      pendingInvites={pendingInvites || []}
    />
  )
}
