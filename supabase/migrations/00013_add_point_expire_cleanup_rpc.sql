-- 自动清理过期的积分 (需要配合 pg_cron 扩展定时调用，或者外部定时任务调用)
CREATE OR REPLACE FUNCTION public.cleanup_expired_points()
RETURNS INTEGER AS $$
DECLARE
    v_package RECORD;
    v_expired_count INTEGER := 0;
BEGIN
    FOR v_package IN 
        SELECT id, user_id, remain_points, point_type
        FROM public.user_point_packages
        WHERE remain_points > 0 
          AND expired_at IS NOT NULL 
          AND expired_at <= NOW()
    LOOP
        -- 将积分包置零
        UPDATE public.user_point_packages 
        SET remain_points = 0
        WHERE id = v_package.id;

        -- 记录过期流水
        INSERT INTO public.credit_logs (
            user_id, amount, description, source, p_type
        ) VALUES (
            v_package.user_id, -v_package.remain_points, '积分已过期失效', 'expire', v_package.point_type
        );

        -- 更新用户的总积分视图(保持 profiles.credits 一致)
        UPDATE public.profiles 
        SET credits = (
            SELECT COALESCE(SUM(remain_points), 0)
            FROM public.user_point_packages
            WHERE user_id = v_package.user_id 
              AND remain_points > 0 
              AND (expired_at IS NULL OR expired_at > NOW())
        )
        WHERE id = v_package.user_id;

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
