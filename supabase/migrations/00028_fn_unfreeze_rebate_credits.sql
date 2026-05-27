
-- 解冻积分：frozen -> available
CREATE OR REPLACE FUNCTION fn_unfreeze_rebate_credits(p_user_id uuid, p_credits numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    rebate_credits_frozen    = GREATEST(COALESCE(rebate_credits_frozen,    0) - p_credits, 0),
    rebate_credits_available = COALESCE(rebate_credits_available, 0) + p_credits,
    updated_at               = now()
  WHERE id = p_user_id;
END;
$$;

-- 冻结积分（下单时调用）：增加 frozen 余额
CREATE OR REPLACE FUNCTION fn_freeze_rebate_credits(p_user_id uuid, p_credits numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    rebate_credits_frozen = COALESCE(rebate_credits_frozen, 0) + p_credits,
    updated_at            = now()
  WHERE id = p_user_id;
END;
$$;
