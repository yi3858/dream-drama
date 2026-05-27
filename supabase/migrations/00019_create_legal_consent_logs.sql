
-- 法律声明同意记录表
CREATE TABLE legal_consent_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  disclaimer_version text NOT NULL DEFAULT 'v1',
  lang          text NOT NULL DEFAULT 'zh',
  agreed_at     timestamptz NOT NULL DEFAULT now(),
  user_agent    text
);

-- 索引：按用户和版本快速查询
CREATE INDEX idx_legal_consent_logs_user_version
  ON legal_consent_logs (user_id, disclaimer_version, agreed_at DESC);

-- 开启 RLS
ALTER TABLE legal_consent_logs ENABLE ROW LEVEL SECURITY;

-- 任何人（含匿名）均可写入自己的同意记录
CREATE POLICY "allow_insert_own_consent"
  ON legal_consent_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 已登录用户只能读取自己的记录
CREATE POLICY "allow_select_own_consent"
  ON legal_consent_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
