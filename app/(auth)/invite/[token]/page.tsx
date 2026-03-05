'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://backman-two.vercel.app'

interface InviteData {
  name: string
  email: string
  role: string
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
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
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleGoogleRegister = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${APP_URL}/auth/callback?invite_token=${token}`,
      },
    })
  }

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
            アカウントの作成方法を選んでください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-md text-sm">
            <p><span className="text-gray-500">メール: </span>{invite?.email}</p>
            <p><span className="text-gray-500">ロール: </span>
              {invite?.role === 'admin' ? '管理者' : invite?.role === 'leader' ? 'リーダー' : 'メンバー'}
            </p>
          </div>

          {/* Googleで登録 */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center gap-3 h-11"
            onClick={handleGoogleRegister}
            disabled={googleLoading || submitting}
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <GoogleIcon />
            )}
            Googleでアカウントを作成
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">またはパスワードで登録</span>
            </div>
          </div>

          {/* パスワードで登録 */}
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード（8文字以上）</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
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
            <Button type="submit" className="w-full h-11" disabled={submitting || googleLoading}>
              {submitting ? '登録中...' : 'アカウントを作成'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
