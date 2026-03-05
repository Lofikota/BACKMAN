import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildInviteEmail } from '@/lib/email/brevo'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, role, team_id } = await request.json()

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 招待レコード作成
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      name,
      email,
      role,
      team_id: team_id || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 招待メール送信
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`
  await sendEmail({
    to: [{ email, name }],
    subject: 'BACKMANへのご招待',
    htmlContent: buildInviteEmail(name, inviteUrl),
  })

  return NextResponse.json({ success: true })
}
