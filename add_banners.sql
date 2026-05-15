-- ==============================================================================
-- BANNER CAROUSEL: Company banners for employee dashboard
-- ==============================================================================
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS banners TEXT[] DEFAULT '{}';
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS banner_interval INTEGER DEFAULT 5;

INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Read Banners" ON storage.objects;
CREATE POLICY "Public Read Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "Auth Upload Banners" ON storage.objects;
CREATE POLICY "Auth Upload Banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth Delete Banners" ON storage.objects;
CREATE POLICY "Auth Delete Banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND auth.role() = 'authenticated');
