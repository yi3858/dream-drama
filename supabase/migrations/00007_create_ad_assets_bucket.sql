
-- ad-assets Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-assets', 'ad-assets', true)
ON CONFLICT (id) DO NOTHING;

-- bucket RLS
CREATE POLICY "ad_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ad-assets');

CREATE POLICY "ad_assets_auth_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-assets');

CREATE POLICY "ad_assets_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'ad-assets');
