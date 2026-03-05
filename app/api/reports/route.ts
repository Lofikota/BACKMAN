import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/gemini'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_type_id, content } = await request.json()
  const today = format(new Date(), 'yyyy-MM-dd')

  // 報告種別取得
  const { data: reportType } = await supabase
    .from('report_types')
    .select('slug, name')
    .eq('id', report_type_id)
    .single()

  if (!reportType) return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })

  // 重複チェック（task_done以外）
  if (reportType.slug !== 'task_done') {
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_type_id', report_type_id)
      .eq('report_date', today)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
    }
  }

  // 報告挿入
  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      report_type_id,
      content: content || null,
      report_date: today,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 日報・依頼完了はナレッジに保存（バックグラウンド）
  if ((reportType.slug === 'daily_report' || reportType.slug === 'task_done') && content) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    try {
      const title = `${today} ${profile?.name ?? ''} - ${reportType.name}`
      const embedding = await generateEmbedding(title + '\n' + content)

      await supabase.from('knowledge_items').insert({
        source_type: 'report',
        title,
        content,
        embedding,
        report_id: report.id,
        created_by: user.id,
      })
    } catch (e) {
      console.error('Embedding generation failed:', e)
    }
  }

  return NextResponse.json({ report, slug: reportType.slug })
}
