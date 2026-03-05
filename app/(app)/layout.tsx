import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar role={profile.role} name={profile.name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
