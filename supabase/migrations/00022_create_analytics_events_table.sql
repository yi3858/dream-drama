-- 通用行为事件统计表
CREATE TABLE analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_type_date_idx ON analytics_events (event_type, created_at DESC);
CREATE INDEX analytics_events_user_idx ON analytics_events (user_id, created_at DESC);

-- RLS：任何人可写入（含未登录用户），管理员通过 service_role 读取
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人可写入事件"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 用户只能查看自己的事件
CREATE POLICY "用户查看自己的事件"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 管理日统计视图（供后台查询，不受 RLS 限制）
CREATE VIEW analytics_daily_copy AS
SELECT
  date_trunc('day', created_at)::date AS stat_date,
  count(*)                             AS copy_count,
  count(DISTINCT user_id)              AS unique_users
FROM analytics_events
WHERE event_type = 'copy_wechat_id'
GROUP BY stat_date
ORDER BY stat_date DESC;