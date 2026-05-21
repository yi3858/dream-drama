
-- 用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'agent2', 'agent1', 'admin');

-- 代理级别枚举
CREATE TYPE public.agent_level AS ENUM ('none', 'agent2', 'agent1');

-- 订单状态枚举
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'completed', 'cancelled', 'refunded');

-- 作品类型枚举
CREATE TYPE public.work_type AS ENUM ('novel_to_comic', 'video_to_anime');

-- 作品状态枚举
CREATE TYPE public.work_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- 提现状态枚举
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- 用户信息表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user',
  credits integer NOT NULL DEFAULT 0,
  agent_level public.agent_level NOT NULL DEFAULT 'none',
  agent_fee_paid boolean NOT NULL DEFAULT false,
  referrer_id uuid REFERENCES public.profiles(id),
  promo_code text UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 积分充值套餐表
CREATE TABLE public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  credits integer NOT NULL,
  bonus_credits integer NOT NULL DEFAULT 0,
  bonus_pct numeric(5,2) NOT NULL DEFAULT 0,
  is_enterprise boolean NOT NULL DEFAULT false,
  validity_days integer,
  max_members integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 订单表
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  package_id uuid REFERENCES public.credit_packages(id),
  order_no text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  pay_method text,
  paid_at timestamptz,
  remark text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 积分变动记录表
CREATE TABLE public.credit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  type text NOT NULL,
  remark text,
  order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 作品表
CREATE TABLE public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  type public.work_type NOT NULL,
  status public.work_status NOT NULL DEFAULT 'pending',
  input_text text,
  input_file_url text,
  style text NOT NULL DEFAULT 'anime',
  resolution text NOT NULL DEFAULT '720p',
  duration_seconds integer,
  estimated_credits integer,
  actual_credits integer,
  scenes jsonb,
  characters jsonb,
  result_url text,
  thumbnail_url text,
  copyright_agreed boolean NOT NULL DEFAULT false,
  error_msg text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 代理等级配置表
CREATE TABLE public.agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.agent_level NOT NULL UNIQUE,
  name text NOT NULL,
  fee numeric(10,2) NOT NULL,
  rebate_pct numeric(5,2) NOT NULL,
  upgrade_condition text,
  min_referrals integer NOT NULL DEFAULT 0,
  min_sales numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  benefits jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 代理返点记录表
CREATE TABLE public.rebate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_amount numeric(10,2) NOT NULL,
  rebate_pct numeric(5,2) NOT NULL,
  rebate_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 提现申请表
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id),
  amount numeric(10,2) NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  account_info jsonb NOT NULL,
  remark text,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 系统配置表
CREATE TABLE public.system_configs (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 推广素材表
CREATE TABLE public.promo_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 作品案例展示表（管理员上传的示例）
CREATE TABLE public.showcase_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type public.work_type NOT NULL,
  thumbnail_url text,
  video_url text,
  tags text[],
  view_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 触发器：自动同步新用户到profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role, promo_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role,
    upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 触发器：更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER works_updated_at BEFORE UPDATE ON public.works FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER agent_configs_updated_at BEFORE UPDATE ON public.agent_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 订单号生成触发器
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_no = 'ORD' || to_char(now(), 'YYYYMMDD') || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_generate_no BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION generate_order_no();

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_works ENABLE ROW LEVEL SECURITY;

-- 角色辅助函数
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = uid; $$;

-- profiles策略
CREATE POLICY "admins_full_profiles" ON profiles FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "users_view_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- credit_packages策略（公开可读）
CREATE POLICY "anyone_view_packages" ON credit_packages FOR SELECT USING (true);
CREATE POLICY "admins_manage_packages" ON credit_packages FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- orders策略
CREATE POLICY "users_view_own_orders" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_create_own_orders" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins_manage_orders" ON orders FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- credit_logs策略
CREATE POLICY "users_view_own_credit_logs" ON credit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins_manage_credit_logs" ON credit_logs FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- works策略
CREATE POLICY "users_manage_own_works" ON works FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins_manage_works" ON works FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- agent_configs策略（公开可读）
CREATE POLICY "anyone_view_agent_configs" ON agent_configs FOR SELECT USING (true);
CREATE POLICY "admins_manage_agent_configs" ON agent_configs FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- rebate_logs策略
CREATE POLICY "agents_view_own_rebates" ON rebate_logs FOR SELECT TO authenticated USING (auth.uid() = agent_id);
CREATE POLICY "admins_manage_rebates" ON rebate_logs FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- withdrawals策略
CREATE POLICY "agents_manage_own_withdrawals" ON withdrawals FOR ALL TO authenticated USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "admins_manage_withdrawals" ON withdrawals FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- system_configs策略
CREATE POLICY "anyone_view_system_configs" ON system_configs FOR SELECT USING (true);
CREATE POLICY "admins_manage_system_configs" ON system_configs FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- promo_materials策略（公开可读）
CREATE POLICY "anyone_view_promo_materials" ON promo_materials FOR SELECT USING (is_active = true);
CREATE POLICY "admins_manage_promo_materials" ON promo_materials FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- showcase_works策略（公开可读）
CREATE POLICY "anyone_view_showcase" ON showcase_works FOR SELECT USING (is_active = true);
CREATE POLICY "admins_manage_showcase" ON showcase_works FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- 公开视图
CREATE VIEW public_profiles AS SELECT id, username, role, agent_level, promo_code, avatar_url FROM profiles;

-- 启用Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.works;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
