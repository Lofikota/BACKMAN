import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

export async function generateChatResponse(
  userMessage: string,
  contextItems: { title: string; content: string }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const contextText = contextItems
    .map((item, i) => `[参考${i + 1}] ${item.title}\n${item.content}`)
    .join('\n\n---\n\n')

  const prompt = `あなたはBACKMANの業務支援AIです。以下の社内ナレッジを参考に質問に答えてください。

【社内ナレッジ】
${contextText}

【質問】
${userMessage}

【回答のルール】
- 社内ナレッジに基づいて回答してください
- ナレッジにない情報は「記録が見つかりません」と伝えてください
- 日本語で簡潔に答えてください`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
