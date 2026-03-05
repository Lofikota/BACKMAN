import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/gemini'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'leader'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
  }

  try {
    const embedding = await generateEmbedding(title + '\n' + content)

    const { error } = await supabase.from('knowledge_items').insert({
      source_type: 'manual',
      title,
      content,
      embedding,
      created_by: user.id,
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save knowledge' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('knowledge_items')
    .select('id, title, source_type, created_at')
    .eq('source_type', 'manual')
    .order('created_at', { ascending: false })

  return NextResponse.json({ items: data || [] })
}
