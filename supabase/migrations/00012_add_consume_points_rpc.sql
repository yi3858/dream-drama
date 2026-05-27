-- 创建通用消费积分RPC，优先扣除即将过期的赠送积分，再扣除充值积分
CREATE OR REPLACE FUNCTION public.consume_points(
    p_user_id UUID,
    p_amount NUMERIC,
    p_reason TEXT,
    p_related_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_points NUMERIC;
    v_remaining_to_deduct NUMERIC := p_amount;
    v_package RECORD;
    v_deduct_amount NUMERIC;
BEGIN
    -- 1. 检查总可用积分是否充足
    SELECT COALESCE(SUM(remain_points), 0) INTO v_total_points
    FROM public.user_point_packages
    WHERE user_id = p_user_id 
      AND remain_points > 0 
      AND (expired_at IS NULL OR expired_at > NOW());

    IF v_total_points < p_amount THEN
        RETURN FALSE; -- 积分不足
    END IF;

    -- 2. 开始按顺序扣除积分 (优先级：先过期时间早的，如果过期时间相同则赠送优先于充值，再按时间早晚)
    FOR v_package IN 
        SELECT id, remain_points, point_type, expired_at
        FROM public.user_point_packages
        WHERE user_id = p_user_id 
          AND remain_points > 0 
          AND (expired_at IS NULL OR expired_at > NOW())
        ORDER BY 
            (expired_at IS NOT NULL) DESC, -- 有过期时间的排前面
            expired_at ASC NULLS LAST,     -- 快过期的排前面
            point_type DESC,               -- gift > recharge (按字母倒序，g>r)
            created_at ASC
        FOR UPDATE -- 加锁防止并发扣减
    LOOP
        IF v_remaining_to_deduct <= 0 THEN
            EXIT;
        END IF;

        IF v_package.remain_points >= v_remaining_to_deduct THEN
            v_deduct_amount := v_remaining_to_deduct;
        ELSE
            v_deduct_amount := v_package.remain_points;
        END IF;

        -- 更新积分包
        UPDATE public.user_point_packages 
        SET remain_points = remain_points - v_deduct_amount
        WHERE id = v_package.id;

        -- 记录流水
        INSERT INTO public.credit_logs (
            user_id, amount, description, source, p_type, expired_at
        ) VALUES (
            p_user_id, -v_deduct_amount, p_reason, p_related_id, v_package.point_type, v_package.expired_at
        );

        v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_amount;
    END LOOP;

    -- 3. 更新 profile 总可用积分(兼容旧逻辑)
    UPDATE public.profiles 
    SET credits = credits - p_amount
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
