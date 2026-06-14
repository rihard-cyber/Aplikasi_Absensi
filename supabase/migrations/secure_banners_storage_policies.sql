-- ==============================================================================
-- SECURITY HARDENING: Isolated Storage Policies for Tenant Banners
-- ==============================================================================
-- Mengamankan bucket 'banners' agar berkas hanya bisa diakses/dikelola
-- oleh karyawan/admin dari tenant masing-masing.

BEGIN;

-- 1. Hapus policy longgar yang lama jika ada
DROP POLICY IF EXISTS "Public Read Banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Banners" ON storage.objects;

DROP POLICY IF EXISTS "Secure Read Banners" ON storage.objects;
DROP POLICY IF EXISTS "Secure Upload Banners" ON storage.objects;
DROP POLICY IF EXISTS "Secure Update Banners" ON storage.objects;
DROP POLICY IF EXISTS "Secure Delete Banners" ON storage.objects;

-- 2. Kebijakan SELECT (Melihat/Membaca Berkas)
-- Diperbolehkan bagi:
--   - SUPER_ADMIN
--   - User terautentikasi yang mengakses subfolder tenant-nya sendiri (misal: banners/<tenant_id>/... atau tenants/<tenant_id>/...)
CREATE POLICY "Secure Read Banners" ON storage.objects FOR SELECT USING (
  bucket_id = 'banners'
  AND auth.role() = 'authenticated'
  AND (
    public.get_my_role() = 'SUPER_ADMIN'
    OR name LIKE 'banners/' || public.get_my_tenant()::text || '/%'
    OR name LIKE 'tenants/' || public.get_my_tenant()::text || '/%'
  )
);

-- 3. Kebijakan INSERT (Mengunggah Berkas Baru)
-- Diperbolehkan bagi:
--   - SUPER_ADMIN
--   - User terautentikasi yang mengunggah ke subfolder tenant-nya sendiri
CREATE POLICY "Secure Upload Banners" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'banners'
  AND auth.role() = 'authenticated'
  AND (
    public.get_my_role() = 'SUPER_ADMIN'
    OR name LIKE 'banners/' || public.get_my_tenant()::text || '/%'
    OR name LIKE 'tenants/' || public.get_my_tenant()::text || '/%'
  )
);

-- 4. Kebijakan UPDATE (Memperbarui Berkas)
-- Diperbolehkan bagi:
--   - SUPER_ADMIN
--   - User terautentikasi yang memperbarui di subfolder tenant-nya sendiri
CREATE POLICY "Secure Update Banners" ON storage.objects FOR UPDATE USING (
  bucket_id = 'banners'
  AND auth.role() = 'authenticated'
  AND (
    public.get_my_role() = 'SUPER_ADMIN'
    OR name LIKE 'banners/' || public.get_my_tenant()::text || '/%'
    OR name LIKE 'tenants/' || public.get_my_tenant()::text || '/%'
  )
);

-- 5. Kebijakan DELETE (Menghapus Berkas)
-- Diperbolehkan bagi:
--   - SUPER_ADMIN
--   - User terautentikasi yang menghapus di subfolder tenant-nya sendiri
CREATE POLICY "Secure Delete Banners" ON storage.objects FOR DELETE USING (
  bucket_id = 'banners'
  AND auth.role() = 'authenticated'
  AND (
    public.get_my_role() = 'SUPER_ADMIN'
    OR name LIKE 'banners/' || public.get_my_tenant()::text || '/%'
    OR name LIKE 'tenants/' || public.get_my_tenant()::text || '/%'
  )
);

COMMIT;
