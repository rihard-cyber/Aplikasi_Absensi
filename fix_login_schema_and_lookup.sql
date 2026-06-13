-- ==============================================================================
-- SI PRESENSI PRO MAX — DATABASE HOTFIX FOR LOGIN & BRANDING LOOKUP
-- Jalankan script ini di Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

BEGIN;

-- 1. Perbaiki kolom NULL di auth.users yang menyebabkan GoTrue error 500 (Database error querying schema)
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;

-- 2. Buat RPC get_tenant_theme agar halaman login bisa lookup branding tenant tanpa membuka hak akses SELECT tabel profiles/tenants ke public (anon)
CREATE OR REPLACE FUNCTION public.get_tenant_theme(p_identifier TEXT)
RETURNS TABLE(name TEXT, logo_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT t.name, t.logo_url
  FROM public.profiles p
  JOIN public.tenants t ON p.tenant_id = t.id
  WHERE p.nip = trim(p_identifier) OR p.email = trim(p_identifier)
  LIMIT 1;
END;
$$;

-- 3. Perbaiki get_email_by_phone agar menggunakan SECURITY DEFINER agar anon bisa menjalankan query pencarian relasi email/phone
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone TEXT)
RETURNS TABLE(email TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  RETURN QUERY
  SELECT u.email FROM auth.users u WHERE u.id IN (SELECT p.auth_id FROM public.profiles p WHERE p.phone = p_phone);
END;
$$;

-- 4. Berikan izin eksekusi fungsi RPC ke anon dan authenticated
GRANT EXECUTE ON FUNCTION public.get_tenant_theme(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_nip(TEXT) TO anon, authenticated;

COMMIT;

-- Muat ulang schema cache PostgREST agar perubahan terdeteksi
NOTIFY pgrst, 'reload schema';
