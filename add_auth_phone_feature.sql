-- =============================================================
-- MIGRATION: Auth Phone / WhatsApp Feature
-- Menambahkan:
--   1. get_email_by_phone()   — Cari email dari nomor HP
--   2. register_profile_with_code() diperbarui — menyimpan nomor HP
-- =============================================================

-- 1. Hapus fungsi lama (karena parameter berubah)
DROP FUNCTION IF EXISTS public.register_profile_with_code(uuid, text, text, text, text, boolean, text);

-- 2. Buat ulang dengan tambahan p_phone
CREATE OR REPLACE FUNCTION public.register_profile_with_code(
  p_auth_id uuid,
  p_full_name text,
  p_nip text,
  p_email text,
  p_activation_code text,
  p_is_tenant_admin boolean DEFAULT false,
  p_device_id text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_nip text;
BEGIN
  IF auth.uid() IS NULL OR p_auth_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized profile registration';
  END IF;

  IF p_is_tenant_admin THEN
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE is_active = true
      AND admin_code = trim(p_activation_code)
    LIMIT 1;
  ELSE
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE is_active = true
      AND activation_code = trim(p_activation_code)
    LIMIT 1;
  END IF;

  IF v_tenant.id IS NULL THEN
    RAISE EXCEPTION 'Kode aktivasi tidak valid';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = p_auth_id) THEN
    SELECT * INTO v_profile FROM public.profiles WHERE auth_id = p_auth_id LIMIT 1;
    RETURN v_profile;
  END IF;

  v_nip := CASE
    WHEN p_is_tenant_admin THEN 'ADMIN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    ELSE nullif(trim(p_nip), '')
  END;

  IF v_nip IS NULL THEN
    RAISE EXCEPTION 'NIP wajib diisi';
  END IF;

  INSERT INTO public.profiles (
    auth_id, tenant_id, full_name, nip, email, phone, role, device_id,
    attendance_access, operational_access
  )
  VALUES (
    p_auth_id, v_tenant.id, trim(p_full_name), v_nip, lower(trim(p_email)),
    nullif(trim(p_phone), ''),
    CASE WHEN p_is_tenant_admin THEN 'TENANT_ADMIN' ELSE 'EMPLOYEE' END,
    p_device_id, true, p_is_tenant_admin
  )
  RETURNING * INTO v_profile;

  IF p_is_tenant_admin THEN
    UPDATE public.tenants SET admin_code = NULL WHERE id = v_tenant.id;
  END IF;

  RETURN v_profile;
END;
$$;

-- 3. Fungsi baru: cari email dari nomor HP (untuk login WhatsApp)
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF p_phone IS NULL OR length(trim(p_phone)) < 4 THEN
    RETURN NULL;
  END IF;
  SELECT email INTO v_email FROM public.profiles WHERE phone = trim(p_phone) LIMIT 1;
  RETURN v_email;
END;
$$;

-- 4. Grant execute
GRANT EXECUTE ON FUNCTION public.register_profile_with_code(uuid, text, text, text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;
