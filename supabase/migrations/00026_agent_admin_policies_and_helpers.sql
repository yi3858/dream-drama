
-- ============================================================
-- 管理员查看所有代理申请
-- ============================================================
CREATE POLICY "管理员管理代理申请"
  ON agent_applications FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 管理员查看所有提现记录
CREATE POLICY "管理员管理提现记录"
  ON withdrawals FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 管理员查看所有返佣记录
CREATE POLICY "管理员查看所有返佣记录"
  ON rebate_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 扣除可提现积分（管理员标记打款后调用）
-- ============================================================
CREATE OR REPLACE FUNCTION fn_deduct_available_rebate(p_user_id uuid, p_credits numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
    SET rebate_credits_available = GREATEST(rebate_credits_available - p_credits, 0)
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- withdrawals 的 reviewed_at 字段（如不存在则补充）
-- ============================================================
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
