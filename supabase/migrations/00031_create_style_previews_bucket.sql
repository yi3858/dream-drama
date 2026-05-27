INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('style-previews', 'style-previews', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "style_previews_public_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'style-previews');

CREATE POLICY "style_previews_service_write" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'style-previews');

CREATE POLICY "style_previews_anon_write" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'style-previews');