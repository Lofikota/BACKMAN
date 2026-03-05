import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const inviteToken = searchParams.get('invite_token')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 既存プロフィール確認
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          return redirectByRole(profile.role, request)
        }

        // プロフィールなし → 新規ユーザー処理
        const admin = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let role = 'member'
        let name = user.user_metadata?.full_name || user.email?.split('@')[0] || '未設定'
        let teamId: string | null = null

        // 招待トークンがある場合（招待リンクからGoogleログイン）
        if (inviteToken) {
          const { data: invitation } = await admin
            .from('invitations')
            .select('*')
            .eq('token', inviteToken)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single()

          if (invitation) {
            role = invitation.role
            name = invitation.name
            teamId = invitation.team_id
            await admin
              .from('invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', invitation.id)
          }
        } else {
          // メールアドレスで招待を検索
          const { data: invitations } = await admin
            .from('invitations')
            .select('*')
            .eq('email', user.email!)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

          const invitation = invitations?.[0]
          if (invitation) {
            role = invitation.role
            name = invitation.name
            teamId = invitation.team_id
            await admin
              .from('invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', invitation.id)
          }
        }

        // プロフィール作成
        await admin.from('profiles').insert({
          id: user.id,
          email: user.email,
          name,
          role,
          team_id: teamId,
        })

        return redirectByRole(role, request)
      }
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

function redirectByRole(role: string, request: NextRequest) {
  if (role === 'member') return NextResponse.redirect(new URL('/member', request.url))
  if (role === 'leader') return NextResponse.redirect(new URL('/leader', request.url))
  return NextResponse.redirect(new URL('/admin', request.url))
}
