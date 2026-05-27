-- 1. 创建积分配置表 (推广活动设置)
CREATE TABLE IF NOT EXISTS public.point_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value NUMERIC NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 插入默认配置
INSERT INTO public.point_configs (key, value, description) VALUES
('register_reward', 30, '新人注册赠送积分'),
('invite_inviter_reward', 20, '成功邀请一人邀请人奖励积分'),
('invite_invitee_reward', 20, '新用户填写邀请码被邀请人奖励积分'),
('reward_validity_days', 30, '赠送积分默认有效期(天)')
ON CONFLICT (key) DO NOTHING;

-- 2. 修改 profiles 表，增加邀请码和上级邀请人字段 (如果不存在)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id);

-- 为现有用户生成邀请码 (简单生成8位随机字母数字)
UPDATE public.profiles SET invite_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 8)) WHERE invite_code IS NULL;

-- 3. 创建积分变动类型枚举
DO $$ BEGIN
    CREATE TYPE point_type AS ENUM ('recharge', 'gift', 'consume', 'deduct', 'expire', 'refund');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. 创建积分明细表 (用于分离管理不同来源和有效期的积分)
CREATE TABLE IF NOT EXISTS public.user_point_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    total_points NUMERIC NOT NULL,     -- 初始积分数
    remain_points NUMERIC NOT NULL,    -- 剩余可用积分数
    point_type point_type NOT NULL,    -- 积分类型: recharge(充值), gift(赠送)
    source_type TEXT NOT NULL,         -- 来源: 'order', 'register', 'invite', 'admin_gift', 'system_init'
    source_id TEXT,                    -- 关联ID (如订单ID、邀请记录ID)
    expired_at TIMESTAMP WITH TIME ZONE, -- 过期时间 (为 NULL 表示永久)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为避免重复发放注册奖励建立唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_point_packages_register ON public.user_point_packages(user_id) WHERE source_type = 'register';

-- 5. 修改现有的 credit_logs 积分流水表 (已存在，直接增加记录即可，为了更好支持展示我们可以加一些字段，或沿用旧表直接插入数据，这里建议扩展字段)
ALTER TABLE public.credit_logs ADD COLUMN IF NOT EXISTS p_type point_type; -- point_type是保留字可能冲突，用p_type
ALTER TABLE public.credit_logs ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- 6. 创建邀请记录明细表
CREATE TABLE IF NOT EXISTS public.invite_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES auth.users(id),
    invitee_id UUID NOT NULL REFERENCES auth.users(id),
    inviter_reward NUMERIC NOT NULL,   -- 邀请人获得的奖励
    invitee_reward NUMERIC NOT NULL,   -- 被邀请人获得的奖励
    status TEXT DEFAULT 'completed',   -- completed, revoked
    remark TEXT,                       -- 管理员备注
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invitee_id)                 -- 一个被邀请人只能有一条有效的绑定记录
);

-- 7. 创建管理员操作日志表
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,         -- 操作类型
    target_id TEXT,                    -- 操作对象ID
    details JSONB,                     -- 操作详情
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 初始化历史用户的初始积分包 (过渡历史数据)
-- 将原 profiles.credits 作为一笔充值记录
INSERT INTO public.user_point_packages (user_id, total_points, remain_points, point_type, source_type)
SELECT id, credits, credits, 'recharge', 'system_init'
FROM public.profiles
WHERE credits > 0 
AND NOT EXISTS (
    SELECT 1 FROM public.user_point_packages WHERE user_id = profiles.id AND source_type = 'system_init'
);