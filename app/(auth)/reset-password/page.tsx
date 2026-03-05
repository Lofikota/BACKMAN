'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">BACKMAN</CardTitle>
          <CardDescription>新しいパスワードを設定</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-center text-green-600 font-medium">
              パスワードを更新しました！ログイン画面に移動します...
            </p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">新しいパスワード（8文字以上）</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">パスワード確認</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '更新中...' : 'パスワードを設定'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
