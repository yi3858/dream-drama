-- 创建用户风格参考图 bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-style-refs',
  'user-style-refs',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
);

-- 公开读
CREATE POLICY "user_style_refs_public_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'user-style-refs');

-- 登录用户可上传自己的文件（路径以 user_id 开头）
CREATE POLICY "user_style_refs_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-style-refs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 登录用户可覆盖/删除自己的文件
CREATE POLICY "user_style_refs_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-style-refs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "user_style_refs_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'user-style-refs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);