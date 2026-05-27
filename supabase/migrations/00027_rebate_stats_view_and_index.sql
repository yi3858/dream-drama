
-- 复合索引：加速按代理+日期聚合
CREATE INDEX IF NOT EXISTS idx_rebate_logs_agent_created
  ON rebate_logs (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rebate_logs_freeze_until
  ON rebate_logs (freeze_until)
  WHERE status = 'frozen';

-- 每日返佣统计视图（供图表查询）
CREATE OR REPLACE VIEW rebate_daily_stats AS
SELECT
  agent_id,
  date_trunc('day', created_at)::date   AS stat_date,
  SUM(credits_amount)                   AS total_credits,
  SUM(CASE WHEN status = 'frozen'    THEN credits_amount ELSE 0 END) AS frozen_credits,
  SUM(CASE WHEN status = 'available' THEN credits_amount ELSE 0 END) AS available_credits,
  SUM(CASE WHEN status = 'withdrawn' THEN credits_amount ELSE 0 END) AS withdrawn_credits,
  COUNT(*)                              AS record_count,
  COUNT(DISTINCT from_user_id)          AS unique_users
FROM rebate_logs
GROUP BY agent_id, date_trunc('day', created_at)::date;

-- 近7天推广转化视图
CREATE OR REPLACE VIEW rebate_weekly_stats AS
SELECT
  agent_id,
  date_trunc('day', created_at)::date   AS stat_date,
  COUNT(DISTINCT from_user_id)          AS new_users,
  SUM(credits_amount)                   AS credits_earned,
  SUM(order_amount)                     AS total_recharge
FROM rebate_logs
WHERE created_at >= now() - INTERVAL '7 days'
  AND source_type = 'promote'
GROUP BY agent_id, date_trunc('day', created_at)::date;

-- 允许已认证用户读取自己的统计数据
ALTER VIEW rebate_daily_stats OWNER TO authenticated;
ALTER VIEW rebate_weekly_stats OWNER TO authenticated;
