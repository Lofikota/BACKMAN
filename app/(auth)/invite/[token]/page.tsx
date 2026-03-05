'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InviteData {
  name: string
  email: string
  role: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const supabase = createClient()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchInvite = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('name, email, role, expires_at, accepted_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else if (data.accepted_at) {
        setNotFound(true)
      } else if (new Date(data.expires_at) < new Date()) {
        setNotFound(true)
      } else {
        setInvite({ name: data.name, email: data.email, role: data.role })
      }
      setLoading(false)
    }
    fetchInvite()
  }, [token])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/members/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '登録に失敗しました')
      setSubmitting(false)
      return
    }

    // 自動ログイン
    await supabase.auth.signInWithPassword({ email: invite!.email, password })
    router.push('/member')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>招待リンクが無効です</CardTitle>
            <CardDescription>
              有効期限切れまたは既に使用済みの招待リンクです。
              管理者に新しい招待を依頼してください。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">BACKMAN</CardTitle>
          <CardDescription>
            {invite?.name} さん、ようこそ！<br />
            パスワードを設定してアカウントを作成してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
            <p><span className="text-gray-500">メール: </span>{invite?.email}</p>
            <p><span className="text-gray-500">ロール: </span>
              {invite?.role === 'admin' ? '管理者' : invite?.role === 'leader' ? 'リーダー' : 'メンバー'}
            </p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">パスワード（8文字以上）</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">パスワード（確認）</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '登録中...' : 'アカウントを作成'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
