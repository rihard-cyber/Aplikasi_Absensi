-- ==============================================================================
-- HOTFIX: Role Name Inconsistency (lowercase 'superadmin' vs uppercase 'SUPER_ADMIN')
-- ==============================================================================
-- Temuan: Database menyimpan role 'superadmin' (lowercase) tapi frontend
-- mengecek 'SUPER_ADMIN' (uppercase). Juga RLS policy di baris 380 schema
-- menggunakan 'superadmin' sementara baris lainnya pakai uppercase.
-- ==============================================================================

-- 1. UPDATE DATA EXISTING: Ubah semua 'superadmin' → 'SUPER_ADMIN'
UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE role = 'superadmin';

-- 2. FIX RLS POLICY: SuperAdmin Akses Penuh Tenants
--    (Sebelumnya: public.get_my_role() = 'superadmin')
DROP POLICY IF EXISTS "SuperAdmin Akses Penuh Tenants" ON public.tenants;
CREATE POLICY "SuperAdmin Akses Penuh Tenants" ON public.tenants
  FOR ALL USING (public.get_my_role() = 'SUPER_ADMIN');

-- 3. FIX RLS POLICY: SuperAdmin Akses Penuh Profil
--    (Sebelumnya: public.get_my_role() = 'superadmin')
DROP POLICY IF EXISTS "SuperAdmin Akses Penuh Profil" ON public.profiles;
CREATE POLICY "SuperAdmin Akses Penuh Profil" ON public.profiles
  FOR ALL USING (public.get_my_role() = 'SUPER_ADMIN');

-- ==============================================================================
-- PERBAIKAN UNTUK ULTIMATE MASTER SCHEMA V4.0
-- ==============================================================================
-- Di file ultimate_master_schema.sql, ubah:
--
-- BARIS 380 (RLS Tenants):
--   FROM: public.get_my_role() = 'superadmin'
--   TO:   public.get_my_role() = 'SUPER_ADMIN'
--
-- BARIS 440 (INSERT Super Admin):
--   FROM: 'superadmin'
--   TO:   'SUPER_ADMIN'
--
-- Semua policy lainnya (TENANT_ADMIN, SUB_ADMIN, EMPLOYEE) sudah benar (uppercase).
-- ==============================================================================
