
-- ============================================================
-- 1. 扩展 rebate_logs：增加积分数量、解冻时间、来源类型字段
-- ============================================================
ALTER TABLE rebate_logs
  ADD COLUMN IF NOT EXISTS credits_amount   numeric      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_until     timestamptz,
  ADD COLUMN IF NOT EXISTS source_type      text         NOT NULL DEFAULT 'promote',
  ADD COLUMN IF NOT EXISTS consumed_credits numeric      NOT NULL DEFAULT 0;

COMMENT ON COLUMN rebate_logs.credits_amount   IS '返佣积分数量（含消费和可提现部分）';
COMMENT ON COLUMN rebate_logs.freeze_until     IS '解冻时间（T+15），NULL 表示已解冻';
COMMENT ON COLUMN rebate_logs.source_type      IS 'promote=推广充值 self=自身充值';
COMMENT ON COLUMN rebate_logs.consumed_credits IS '该条记录中已被平台消费的积分（不可再提现）';

-- status 含义：frozen=冻结中  available=可提现  withdrawn=已提现  consumed=已消费
-- 现有 pending/settled 映射为 frozen/available
-- 不做列修改，status 字段已存在且为 text 类型，添加约束注释即可

-- ============================================================
-- 2. 代理申请表
-- ============================================================
CREATE TABLE agent_applications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level          text        NOT NULL CHECK (level IN ('agent1','agent2')),
  fee            numeric     NOT NULL,
  contact_info   text        NOT NULL DEFAULT '',
  reason         text        NOT NULL DEFAULT '',
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason  text,
  order_id       uuid        REFERENCES orders(id),
  reviewed_by    uuid        REFERENCES profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_applications_user_id ON agent_applications(user_id);
CREATE INDEX idx_agent_applications_status  ON agent_applications(status);

-- ============================================================
-- 3. 新增 system_configs 中的积分汇率和提现相关配置
-- ============================================================
INSERT INTO system_configs (key, value, description)
VALUES
  ('credits_exchange_rate', '10',   '积分兑换汇率：N积分=1元'),
  ('rebate_freeze_days',    '15',   '返佣积分冻结天数（T+N）'),
  ('min_withdraw_credits',  '5000', '最低提现积分数量（对应500元）')
ON CONFLICT (key) DO NOTHING;

-- 确保 min_withdrawal 为500
UPDATE system_configs SET value = '500' WHERE key = 'min_withdrawal';

-- ============================================================
-- 4. profiles 增加代理返佣积分汇总字段（冗余字段，提高查询性能）
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rebate_credits_frozen    numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rebate_credits_available numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.rebate_credits_frozen    IS '冻结中的返佣积分（可消费不可提现）';
COMMENT ON COLUMN profiles.rebate_credits_available IS '可提现的返佣积分';

-- ============================================================
-- 5. withdrawals 增加积分数量字段
-- ============================================================
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS credits_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reject_reason  text;

COMMENT ON COLUMN withdrawals.credits_amount IS '提现消耗的积分数量';
COMMENT ON COLUMN withdrawals.reject_reason  IS '驳回原因';

-- ============================================================
-- 6. RLS 策略
-- ============================================================
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的申请
CREATE POLICY "用户查看自己的代理申请"
  ON agent_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 用户只能提交自己的申请
CREATE POLICY "用户提交代理申请"
  ON agent_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 用户查看自己的返佣记录
CREATE POLICY "用户查看自己的返佣记录"
  ON rebate_logs FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- 用户查看自己的提现记录
CREATE POLICY "用户查看自己的提现记录"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- 用户提交提现申请
CREATE POLICY "用户提交提现申请"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());
