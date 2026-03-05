-- pgvector類似検索用関数
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    k.id,
    k.title,
    k.content,
    k.source_type,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_items k
  WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 週次サマリ用ビュー
CREATE OR REPLACE VIEW attendance_summary AS
SELECT
  r.report_date,
  r.user_id,
  p.name AS user_name,
  p.team_id,
  MIN(CASE WHEN rt.slug = 'work_start' THEN r.submitted_at END) AS work_start,
  MAX(CASE WHEN rt.slug = 'work_end' THEN r.submitted_at END) AS work_end,
  BOOL_OR(rt.slug = 'daily_report') AS has_daily_report,
  COUNT(CASE WHEN rt.slug = 'task_done' THEN 1 END) AS task_count
FROM reports r
JOIN profiles p ON p.id = r.user_id
JOIN report_types rt ON rt.id = r.report_type_id
GROUP BY r.report_date, r.user_id, p.name, p.team_id;
