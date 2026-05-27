
-- ── 扣除积分（用于生成任务）────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_deduct_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text DEFAULT '消费'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance integer;
BEGIN
  -- 原子性扣减并检查余额
  UPDATE profiles
  SET credits = credits - p_amount, updated_at = now()
  WHERE id = p_user_id AND credits >= p_amount
  RETURNING credits INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION '积分不足';
  END IF;

  -- 记录流水
  INSERT INTO credit_logs (user_id, amount, balance_after, type, remark)
  VALUES (p_user_id, -p_amount, v_balance, 'consume', p_reason);
END;
$$;

-- ── 增加积分（用于退款/奖励）───────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_add_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text    DEFAULT '退款',
  p_source  text    DEFAULT 'refund'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance integer;
BEGIN
  UPDATE profiles
  SET credits = credits + p_amount, updated_at = now()
  WHERE id = p_user_id
  RETURNING credits INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在';
  END IF;

  INSERT INTO credit_logs (user_id, amount, balance_after, type, remark)
  VALUES (p_user_id, p_amount, v_balance, p_source, p_reason);
END;
$$;
