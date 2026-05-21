
-- orders 表增加微信支付相关字段
ALTER TABLE public.orders
  ADD COLUMN wechat_pay_url text,
  ADD COLUMN order_type text NOT NULL DEFAULT 'credit' CHECK (order_type IN ('credit', 'agent_fee')),
  ADD COLUMN refund_amount numeric(12,2),
  ADD COLUMN refund_no text UNIQUE;

-- order_status enum 增加 partial_refunded
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partial_refunded';

-- 退款申请表（管理员审批后执行退款）
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL REFERENCES public.orders(order_no),
  refund_no text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  refund_amount numeric(12,2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_refunds" ON refund_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_create_own_refunds" ON refund_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins_manage_refunds" ON refund_requests FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);
CREATE TRIGGER refund_requests_updated_at BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 允许 service role 更新 orders（webhook 用）
CREATE POLICY "service_role_update_orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);
