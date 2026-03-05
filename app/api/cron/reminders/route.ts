import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildReminderEmail, buildEscalationEmail } from '@/lib/email/brevo'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// JST変換（日本時間で期限を判定）
const JST = 'Asia/Tokyo'

export async function POST(request: NextRequest) {
  // cron認証チェック
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const nowJST = toZonedTime(new Date(), JST)
  const today = format(nowJST, 'yyyy-MM-dd')
  const nowTime = format(nowJST, 'HH:mm')

  // アクティブなメンバーと報告種別を取得
  const [{ data: members }, { data: reportTypes }, { data: todayReports }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, name, team_id')
      .eq('is_active', true)
      .eq('role', 'member'),
    supabase
      .from('report_types')
      .select('*')
      .eq('is_active', true)
      .not('deadline_time', 'is', null),
    supabase
      .from('reports')
      .select('user_id, report_type_id')
      .eq('report_date', today),
  ])

  if (!members || !reportTypes) {
    return NextResponse.json({ processed: 0 })
  }

  const submittedSet = new Set(
    (todayReports || []).map(r => `${r.user_id}-${r.report_type_id}`)
  )

  let sent = 0

  for (const rt of reportTypes) {
    if (!rt.deadline_time) continue
    const deadlineStr = rt.deadline_time.slice(0, 5) // "HH:mm"

    // 現在時刻が期限を超えているか確認
    if (nowTime <= deadlineStr) continue

    // 期限から30分・60分後を計算
    const [dh, dm] = deadlineStr.split(':').map(Number)
    const deadlineMin = dh * 60 + dm
    const nowMin = parseInt(nowTime.split(':')[0]) * 60 + parseInt(nowTime.split(':')[1])
    const elapsed = nowMin - deadlineMin

    // リマインドタイミング: 30分後 or 60分後
    const shouldSendFirst = elapsed >= 30 && elapsed < 60
    const shouldSendSecond = elapsed >= 60 && elapsed < 90

    if (!shouldSendFirst && !shouldSendSecond) continue

    const reminderCount = shouldSendFirst ? 1 : 2

    for (const member of members) {
      if (submittedSet.has(`${member.id}-${rt.id}`)) continue

      // 既に同回数送信済みか確認
      const { data: existing } = await supabase
        .from('reminder_logs')
        .select('id')
        .eq('user_id', member.id)
        .eq('report_type_id', rt.id)
        .eq('reminder_count', reminderCount)
        .gte('sent_at', today + 'T00:00:00')
        .single()

      if (existing) continue

      // リマインドメール送信
      try {
        await sendEmail({
          to: [{ email: member.email, name: member.name }],
          subject: `【リマインド】${rt.name}の提出をお願いします`,
          htmlContent: buildReminderEmail(member.name, rt.name, reminderCount),
        })

        await supabase.from('reminder_logs').insert({
          user_id: member.id,
          report_type_id: rt.id,
          reminder_count: reminderCount,
        })

        sent++
      } catch (e) {
        console.error('Reminder email failed:', e)
      }

      // 2回目のリマインド → リーダーにエスカレーション
      if (reminderCount === 2 && member.team_id) {
        const { data: leaders } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('team_id', member.team_id)
          .eq('role', 'leader')
          .eq('is_active', true)

        for (const leader of leaders || []) {
          try {
            await sendEmail({
              to: [{ email: leader.email, name: leader.name }],
              subject: `【要確認】${member.name}さんが${rt.name}を未提出`,
              htmlContent: buildEscalationEmail(leader.name, member.name, rt.name),
            })

            await supabase
              .from('reminder_logs')
              .update({ escalated_at: new Date().toISOString() })
              .eq('user_id', member.id)
              .eq('report_type_id', rt.id)
              .eq('reminder_count', 2)
          } catch (e) {
            console.error('Escalation email failed:', e)
          }
        }
      }
    }
  }

  return NextResponse.json({ processed: sent, timestamp: nowJST.toISOString() })
}

// Vercel Cron: GET でも動作するよう対応
export async function GET(request: NextRequest) {
  return POST(request)
}
