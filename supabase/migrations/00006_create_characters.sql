
-- 角色库主表
CREATE TABLE characters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 200),
  avatar_url  text,
  tags        text[] NOT NULL DEFAULT '{}',
  is_public   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_characters_user_id   ON characters(user_id);
CREATE INDEX idx_characters_is_public ON characters(is_public);
CREATE INDEX idx_characters_created_at ON characters(created_at DESC);

-- 启用 RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- 辅助函数：判断是否为本人
CREATE FUNCTION is_owner_of_character(char_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM characters WHERE id = char_id AND user_id = auth.uid());
$$;

-- 辅助函数：判断是否 admin
CREATE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 读：本人可读自己所有角色 + 公开角色所有人可读
CREATE POLICY "characters_read" ON characters
  FOR SELECT USING (
    user_id = auth.uid()   -- 本人
    OR is_public = true    -- 公开
    OR is_admin()          -- 管理员
  );

-- 新增：仅本人
CREATE POLICY "characters_insert" ON characters
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 更新：本人 OR 管理员
CREATE POLICY "characters_update" ON characters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- 删除：本人 OR 管理员
CREATE POLICY "characters_delete" ON characters
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('character-assets', 'character-assets', true)
  ON CONFLICT (id) DO NOTHING;

-- bucket policies
CREATE POLICY "character_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'character-assets');

CREATE POLICY "character_assets_auth_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'character-assets');

CREATE POLICY "character_assets_owner_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'character-assets');

CREATE POLICY "character_assets_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'character-assets');
