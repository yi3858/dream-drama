-- Add RLS for point_configs
ALTER TABLE public.point_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read point_configs"
ON public.point_configs FOR SELECT
USING (true);

CREATE POLICY "Only admins can update point_configs"
ON public.point_configs FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can insert point_configs"
ON public.point_configs FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add RLS for user_point_packages
ALTER TABLE public.user_point_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own point_packages"
ON public.user_point_packages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all point_packages"
ON public.user_point_packages FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add RLS for invite_records
ALTER TABLE public.invite_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invite_records"
ON public.invite_records FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Admins can read all invite_records"
ON public.invite_records FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update invite_records"
ON public.invite_records FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add RLS for admin_operation_logs
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_operation_logs"
ON public.admin_operation_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
