'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Upload, BookOpen, Bot, User } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

interface Props {
  role: string
}

export default function ChatClient({ role }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'こんにちは！BACKMANのナレッジアシスタントです。業務手順や過去の報告内容について何でも聞いてください。',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadContent, setUploadContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'エラーが発生しました。',
        sources: data.sources,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。しばらくしてから再度お試しください。',
      }])
    }
    setLoading(false)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTitle.trim() || !uploadContent.trim()) return
    setUploading(true)
    const fd = new FormData()
    fd.append('title', uploadTitle)
    fd.append('content', uploadContent)
    const res = await fetch('/api/knowledge', { method: 'POST', body: fd })
    if (res.ok) {
      setUploadSuccess(true)
      setUploadTitle('')
      setUploadContent('')
      setTimeout(() => setUploadSuccess(false), 3000)
    }
    setUploading(false)
  }

  const isAdmin = ['admin', 'leader'].includes(role)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">ナレッジ検索</h2>

      <Tabs defaultValue="chat">
        <TabsList className="mb-4">
          <TabsTrigger value="chat">
            <Bot className="h-4 w-4 mr-2" />
            チャット
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              マニュアル登録
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-4">
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-slate-800 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">参照元:</p>
                            {msg.sources.map((s, j) => (
                              <p key={j} className="text-xs text-gray-400">・{s}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="質問を入力してください..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={loading}
                />
                <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  マニュアル・手順書を登録
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">タイトル</label>
                    <Input
                      placeholder="例: 新規クライアント対応手順"
                      value={uploadTitle}
                      onChange={e => setUploadTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">内容</label>
                    <Textarea
                      placeholder="マニュアルや手順書の内容を入力してください..."
                      value={uploadContent}
                      onChange={e => setUploadContent(e.target.value)}
                      rows={10}
                      required
                    />
                  </div>
                  {uploadSuccess && (
                    <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                      ナレッジを登録しました。チャットで質問できます。
                    </p>
                  )}
                  <Button type="submit" disabled={uploading}>
                    {uploading ? '登録中...' : 'ナレッジに登録'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
