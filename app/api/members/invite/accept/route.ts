import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { token, password } = await request.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 招待確認
  const { data: invitation, error: invErr } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (invErr || !invitation) {
    return NextResponse.json({ error: '招待が無効または期限切れです' }, { status: 400 })
  }

  // Supabase Authユーザー作成
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message || 'ユーザー作成に失敗しました' }, { status: 500 })
  }

  // プロフィール作成
  const { error: profileErr } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    team_id: invitation.team_id,
  })

  if (profileErr) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'プロフィール作成に失敗しました' }, { status: 500 })
  }

  // 招待を使用済みにする
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ success: true })
}
