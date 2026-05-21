
-- 画风配置表
CREATE TABLE style_configs (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT 'from-violet-500 to-purple-600',
  preview_url text NOT NULL DEFAULT '',
  video_url   text,
  tags        text[] NOT NULL DEFAULT '{}',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE style_configs ENABLE ROW LEVEL SECURITY;

-- 公开读取（任何人，含未登录）
CREATE POLICY "style_configs_public_read" ON style_configs
  FOR SELECT USING (true);

-- 仅 admin 可写（insert / update / delete）
CREATE FUNCTION can_admin_style_configs()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "style_configs_admin_insert" ON style_configs
  FOR INSERT TO authenticated WITH CHECK (can_admin_style_configs());

CREATE POLICY "style_configs_admin_update" ON style_configs
  FOR UPDATE TO authenticated USING (can_admin_style_configs()) WITH CHECK (can_admin_style_configs());

CREATE POLICY "style_configs_admin_delete" ON style_configs
  FOR DELETE TO authenticated USING (can_admin_style_configs());

-- Storage bucket for style assets (videos + preview images)
INSERT INTO storage.buckets (id, name, public) VALUES ('style-assets', 'style-assets', true)
  ON CONFLICT (id) DO NOTHING;

-- bucket policy: public read
CREATE POLICY "style_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'style-assets');

-- bucket policy: admin upload
CREATE POLICY "style_assets_admin_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'style-assets' AND can_admin_style_configs()
  );

CREATE POLICY "style_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'style-assets' AND can_admin_style_configs()
  );

CREATE POLICY "style_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'style-assets' AND can_admin_style_configs()
  );
