import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateChatResponse } from '@/lib/ai/gemini'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await request.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // クエリのembedding生成
  const queryEmbedding = await generateEmbedding(message)

  // pgvectorで類似ナレッジを検索（上位5件）
  const { data: similarItems, error } = await supabase.rpc('match_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
  })

  if (error) {
    console.error('Vector search error:', error)
  }

  const contextItems = (similarItems || []).map((item: { title: string; content: string }) => ({
    title: item.title,
    content: item.content,
  }))

  const answer = await generateChatResponse(message, contextItems)

  return NextResponse.json({ answer, sources: contextItems.map((c: { title: string }) => c.title) })
}
