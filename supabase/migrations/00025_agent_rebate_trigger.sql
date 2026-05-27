
-- ============================================================
-- 获取返佣配置的辅助函数
-- ============================================================
CREATE OR REPLACE FUNCTION get_system_config(p_key text, p_default text DEFAULT '0')
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT value FROM system_configs WHERE key = p_key), p_default);
$$;

-- ============================================================
-- 订单支付后自动触发返佣：检查付款人是否是代理，或其推荐人是否是代理
-- ============================================================
CREATE OR REPLACE FUNCTION fn_auto_rebate_on_order()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agent_id        uuid;
  v_agent_level     text;
  v_rebate_pct      numeric;
  v_freeze_days     int;
  v_exchange_rate   numeric;
  v_rebate_yuan     numeric;
  v_rebate_credits  numeric;
  v_source_type     text;
  v_freeze_until    timestamptz;
  v_payer           profiles%ROWTYPE;
  v_config          agent_configs%ROWTYPE;
BEGIN
  -- 只处理变为 paid 状态的订单
  IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  -- 获取配置
  v_freeze_days   := get_system_config('rebate_settle_days', '15')::int;
  v_exchange_rate := get_system_config('credits_exchange_rate', '10')::numeric;
  v_freeze_until  := now() + (v_freeze_days || ' days')::interval;

  -- 获取付款人信息
  SELECT * INTO v_payer FROM profiles WHERE id = NEW.user_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 场景1：付款人本身是代理（自充返佣）
  IF v_payer.agent_level IN ('agent1', 'agent2') THEN
    v_agent_id    := v_payer.id;
    v_source_type := 'self';
    SELECT * INTO v_config FROM agent_configs WHERE level = v_payer.agent_level LIMIT 1;
    IF FOUND THEN
      v_rebate_pct     := v_config.rebate_pct;
      v_rebate_yuan    := NEW.amount * v_rebate_pct / 100;
      v_rebate_credits := v_rebate_yuan * v_exchange_rate;

      INSERT INTO rebate_logs (
        agent_id, from_user_id, order_id, order_amount,
        rebate_pct, rebate_amount, credits_amount,
        status, freeze_until, source_type
      ) VALUES (
        v_agent_id, NEW.user_id, NEW.id, NEW.amount,
        v_rebate_pct, v_rebate_yuan, v_rebate_credits,
        'frozen', v_freeze_until, 'self'
      );

      -- 增加冻结积分
      UPDATE profiles
        SET rebate_credits_frozen = rebate_credits_frozen + v_rebate_credits
      WHERE id = v_agent_id;
    END IF;
  END IF;

  -- 场景2：付款人的推荐人是代理（推广返佣）
  IF v_payer.inviter_id IS NOT NULL AND v_payer.inviter_id <> NEW.user_id THEN
    DECLARE
      v_inviter profiles%ROWTYPE;
    BEGIN
      SELECT * INTO v_inviter FROM profiles WHERE id = v_payer.inviter_id;
      IF FOUND AND v_inviter.agent_level IN ('agent1', 'agent2') THEN
        -- 避免重复：不要与自充场景的代理重叠
        IF v_inviter.id <> NEW.user_id THEN
          SELECT * INTO v_config FROM agent_configs WHERE level = v_inviter.agent_level LIMIT 1;
          IF FOUND THEN
            v_rebate_pct     := v_config.rebate_pct;
            v_rebate_yuan    := NEW.amount * v_rebate_pct / 100;
            v_rebate_credits := v_rebate_yuan * v_exchange_rate;

            INSERT INTO rebate_logs (
              agent_id, from_user_id, order_id, order_amount,
              rebate_pct, rebate_amount, credits_amount,
              status, freeze_until, source_type
            ) VALUES (
              v_inviter.id, NEW.user_id, NEW.id, NEW.amount,
              v_rebate_pct, v_rebate_yuan, v_rebate_credits,
              'frozen', v_freeze_until, 'promote'
            );

            UPDATE profiles
              SET rebate_credits_frozen = rebate_credits_frozen + v_rebate_credits
            WHERE id = v_inviter.id;
          END IF;
        END IF;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_rebate ON orders;
CREATE TRIGGER trg_auto_rebate
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_rebate_on_order();

-- ============================================================
-- 返佣积分解冻函数（由前端或定时任务调用）
-- 将到期的 frozen 状态记录转为 available
-- ============================================================
CREATE OR REPLACE FUNCTION fn_unfreeze_rebate_credits()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int := 0;
  rec     rebate_logs%ROWTYPE;
BEGIN
  FOR rec IN
    SELECT * FROM rebate_logs
    WHERE status = 'frozen'
      AND freeze_until IS NOT NULL
      AND freeze_until <= now()
  LOOP
    -- 可提现积分 = 总积分 - 已消费积分
    DECLARE
      v_available numeric := GREATEST(rec.credits_amount - rec.consumed_credits, 0);
    BEGIN
      UPDATE rebate_logs
        SET status = 'available', settled_at = now()
      WHERE id = rec.id;

      UPDATE profiles
        SET rebate_credits_frozen    = GREATEST(rebate_credits_frozen - rec.credits_amount, 0),
            rebate_credits_available = rebate_credits_available + v_available
      WHERE id = rec.agent_id;

      v_count := v_count + 1;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 消费积分时优先扣除冻结返佣积分的辅助函数
-- ============================================================
CREATE OR REPLACE FUNCTION fn_consume_frozen_rebate(p_user_id uuid, p_credits numeric)
RETURNS numeric  -- 返回实际从冻结积分中扣除的数量
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_frozen   numeric;
  v_to_consume     numeric;
  remaining        numeric := p_credits;
  rec              rebate_logs%ROWTYPE;
  deduct           numeric;
BEGIN
  -- 获取用户冻结积分总量
  SELECT rebate_credits_frozen INTO v_total_frozen
  FROM profiles WHERE id = p_user_id;

  IF v_total_frozen <= 0 THEN RETURN 0; END IF;

  v_to_consume := LEAST(remaining, v_total_frozen);

  -- 逐条扣除（按 freeze_until 升序，先扣即将解冻的）
  FOR rec IN
    SELECT * FROM rebate_logs
    WHERE agent_id = p_user_id
      AND status = 'frozen'
      AND (credits_amount - consumed_credits) > 0
    ORDER BY freeze_until ASC NULLS LAST
  LOOP
    EXIT WHEN remaining <= 0;
    deduct := LEAST(remaining, rec.credits_amount - rec.consumed_credits);

    UPDATE rebate_logs
      SET consumed_credits = consumed_credits + deduct
    WHERE id = rec.id;

    remaining := remaining - deduct;
  END LOOP;

  -- 更新 profile 冻结积分余额
  UPDATE profiles
    SET rebate_credits_frozen = GREATEST(rebate_credits_frozen - v_to_consume, 0)
  WHERE id = p_user_id;

  RETURN v_to_consume;
END;
$$;
