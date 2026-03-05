'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://backman-saas-9doz00a97-445s-projects.vercel.app'

// Google公式ロゴSVG
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

// Appleロゴ SVG
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 0 290.4 0 208.3c0-122.8 80.2-187.8 158.9-187.8 70.5 0 119.6 46.5 158.4 46.5 36.7 0 94.7-49.3 172.8-49.3 28.2 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" fill="#000"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // ログインフォーム
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // パスワードリセット
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  // OAuthローディング状態
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  // メール+パスワードでログイン
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'member') {
        router.push('/member')
      } else {
        router.push('/admin')
      }
    }
  }

  // Googleでログイン
  const handleGoogleLogin = async () => {
    setOauthLoading('google')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${APP_URL}/auth/callback`,
      },
    })
  }

  // Appleでログイン
  const handleAppleLogin = async () => {
    setOauthLoading('apple')
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${APP_URL}/auth/callback`,
      },
    })
  }

  // パスワードリセットメール送信
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${APP_URL}/auth/callback?type=recovery`,
    })

    if (error) {
      setResetMessage('送信に失敗しました。メールアドレスを確認してください。')
    } else {
      setResetMessage('パスワードリセットメールを送信しました。メールをご確認ください。')
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">BACKMAN</CardTitle>
          <CardDescription>業務管理システムにログイン</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ソーシャルログインボタン */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-3 h-11 font-medium"
              onClick={handleGoogleLogin}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'google' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : (
                <GoogleIcon />
              )}
              Googleでログイン
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-3 h-11 font-medium"
              onClick={handleAppleLogin}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'apple' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : (
                <AppleIcon />
              )}
              Appleでログイン
            </Button>
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">またはメールで続ける</span>
            </div>
          </div>

          {/* メール+パスワードログインフォーム */}
          {!showReset ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  パスワードをお忘れの方
                </button>
              </div>
            </form>
          ) : (
            /* パスワードリセットフォーム */
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">登録済みのメールアドレス</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                />
              </div>
              {resetMessage && (
                <p className={`text-sm p-3 rounded-md ${
                  resetMessage.includes('送信しました')
                    ? 'text-green-700 bg-green-50'
                    : 'text-red-600 bg-red-50'
                }`}>
                  {resetMessage}
                </p>
              )}
              <Button type="submit" className="w-full h-11" disabled={resetLoading}>
                {resetLoading ? '送信中...' : 'リセットメールを送る'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetMessage('') }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  ← ログインに戻る
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
