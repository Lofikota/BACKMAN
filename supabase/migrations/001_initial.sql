-- pgvector有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- チーム
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザープロフィール（auth.usersと紐付け）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'leader', 'admin')),
  team_id UUID REFERENCES teams(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 招待管理
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 報告種別マスタ
CREATE TABLE report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  deadline_time TIME,
  order_index INT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- マスタ初期データ
INSERT INTO report_types (name, slug, deadline_time, order_index) VALUES
  ('起床報告',   'wakeup',       '09:00', 1),
  ('業務開始',   'work_start',   '09:30', 2),
  ('依頼完了',   'task_done',    NULL,    3),
  ('業務終了',   'work_end',     '18:30', 4),
  ('日報',       'daily_report', '19:00', 5);

-- 報告データ
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  report_type_id UUID NOT NULL REFERENCES report_types(id),
  content TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- リマインドログ
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  report_type_id UUID NOT NULL REFERENCES report_types(id),
  reminder_count INT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  escalated_at TIMESTAMPTZ
);

-- ナレッジ（pgvector RAG用）
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('report', 'manual')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  report_id UUID REFERENCES reports(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ベクター検索インデックス
CREATE INDEX ON knowledge_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ===========================
-- RLS (Row Level Security)
-- ===========================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

-- プロフィール: 自分のみ更新、全員参照（アクティブのみ）
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (is_active = true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_service" ON profiles FOR INSERT WITH CHECK (true);

-- 報告種別: 全員参照可
CREATE POLICY "report_types_select" ON report_types FOR SELECT USING (true);

-- 報告: メンバーは自分のもの、リーダー/管理者は全部
CREATE POLICY "reports_select_own" ON reports FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')
    )
  );
CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (user_id = auth.uid());

-- リマインドログ: リーダー・管理者のみ参照
CREATE POLICY "reminder_logs_select" ON reminder_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin'))
  );
CREATE POLICY "reminder_logs_insert_service" ON reminder_logs FOR INSERT WITH CHECK (true);

-- ナレッジ: 全員参照・管理者/リーダーのみ追加
CREATE POLICY "knowledge_select" ON knowledge_items FOR SELECT USING (true);
CREATE POLICY "knowledge_insert" ON knowledge_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin'))
    OR source_type = 'report'
  );

-- チーム: 全員参照、管理者のみ変更
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_manage" ON teams FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 招待: 管理者のみ
CREATE POLICY "invitations_manage" ON invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ===========================
-- pg_cron: リマインダー定期実行
-- ===========================
-- Supabase Dashboardで以下を実行（pg_cron拡張が必要）:
-- SELECT cron.schedule('check-reminders', '*/30 * * * *',
--   $$SELECT net.http_post(
--     url := 'https://your-app.vercel.app/api/cron/reminders',
--     headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );
