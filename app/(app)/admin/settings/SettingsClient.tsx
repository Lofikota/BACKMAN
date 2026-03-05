'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Plus } from 'lucide-react'
import type { ReportType, Team } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  reportTypes: ReportType[]
  teams: Team[]
}

export default function SettingsClient({ reportTypes: initial, teams: initialTeams }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [reportTypes, setReportTypes] = useState(initial)
  const [teams, setTeams] = useState(initialTeams)
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateDeadline = (id: string, value: string) => {
    setReportTypes(prev => prev.map(rt =>
      rt.id === id ? { ...rt, deadline_time: value } : rt
    ))
  }

  const saveSettings = async () => {
    setSaving(true)
    for (const rt of reportTypes) {
      await supabase
        .from('report_types')
        .update({ deadline_time: rt.deadline_time || null })
        .eq('id', rt.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addTeam = async () => {
    if (!newTeamName.trim()) return
    const { data } = await supabase
      .from('teams')
      .insert({ name: newTeamName.trim() })
      .select()
      .single()
    if (data) {
      setTeams(prev => [...prev, data])
      setNewTeamName('')
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">設定</h2>

      {/* 報告種別の期限設定 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">報告期限の設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportTypes.map(rt => (
            <div key={rt.id} className="flex items-center gap-4">
              <Label className="w-24 text-sm">{rt.name}</Label>
              {rt.slug === 'task_done' ? (
                <span className="text-sm text-gray-400">期限なし（都度提出）</span>
              ) : (
                <Input
                  type="time"
                  value={rt.deadline_time?.slice(0, 5) || ''}
                  onChange={e => updateDeadline(rt.id, e.target.value)}
                  className="w-32"
                />
              )}
            </div>
          ))}
          <Button onClick={saveSettings} disabled={saving} className="mt-4">
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : saved ? '保存しました！' : '設定を保存'}
          </Button>
        </CardContent>
      </Card>

      {/* チーム管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">チーム管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {teams.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">{t.name}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="新しいチーム名"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTeam()}
            />
            <Button onClick={addTeam} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
