'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Trash2, Mail, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { Profile, Team, Invitation } from '@/lib/types'

interface Props {
  profiles: Profile[]
  teams: Team[]
  pendingInvites: Invitation[]
}

export default function MembersClient({ profiles, teams, pendingInvites }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [inviteData, setInviteData] = useState({
    name: '', email: '', role: 'member', team_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteData),
    })
    if (res.ok) {
      setSuccess(`${inviteData.name} さんに招待メールを送信しました`)
      setInviteData({ name: '', email: '', role: 'member', team_id: '' })
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || '招待に失敗しました')
    }
    setLoading(false)
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`${name} さんのアカウントを無効化しますか？`)) return
    await fetch(`/api/members/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">メンバー管理</h2>
          <p className="text-sm text-gray-500 mt-1">{profiles.length}名のメンバー</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              メンバーを招待
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規メンバーを招待</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>氏名</Label>
                <Input
                  placeholder="田中 太郎"
                  value={inviteData.name}
                  onChange={e => setInviteData(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input
                  type="email"
                  placeholder="taro@example.com"
                  value={inviteData.email}
                  onChange={e => setInviteData(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>ロール</Label>
                <Select
                  value={inviteData.role}
                  onValueChange={v => setInviteData(p => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">メンバー</SelectItem>
                    <SelectItem value="leader">リーダー</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>チーム（任意）</Label>
                <Select
                  value={inviteData.team_id}
                  onValueChange={v => setInviteData(p => ({ ...p, team_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="チームを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '送信中...' : '招待メールを送信'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
      )}

      {/* 招待待ち */}
      {pendingInvites.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              招待待ち ({pendingInvites.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{inv.name}</p>
                    <p className="text-xs text-gray-500">{inv.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {inv.role === 'admin' ? '管理者' : inv.role === 'leader' ? 'リーダー' : 'メンバー'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {format(new Date(inv.expires_at), 'M/d')}まで
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* メンバー一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">メンバー一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">氏名</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">メール</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">ロール</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">チーム</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-3 text-gray-500">{p.email}</td>
                  <td className="py-3 px-3">
                    <Badge variant="outline">
                      {p.role === 'admin' ? '管理者' : p.role === 'leader' ? 'リーダー' : 'メンバー'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-gray-500">
                    {(p.teams as { name: string } | null)?.name ?? '-'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeactivate(p.id, p.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
