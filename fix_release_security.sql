-- Release security hardening for SI PRESENSI.
-- Jalankan setelah schema utama. Script ini mengganti policy longgar dan
-- menambahkan RPC aman untuk registrasi tanpa membuka kode tenant ke client.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_tenant_registration_code(p_code text, p_admin boolean DEFAULT false)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN;
  END IF;

  IF p_admin THEN
    RETURN QUERY
      SELECT t.id, t.name
      FROM public.tenants t
      WHERE t.is_active = true
        AND t.admin_code = trim(p_code)
      LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT t.id, t.name
      FROM public.tenants t
      WHERE t.is_active = true
        AND t.activation_code = trim(p_code)
      LIMIT 1;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_profile_with_code(
  p_auth_id uuid,
  p_full_name text,
  p_nip text,
  p_email text,
  p_activation_code text,
  p_is_tenant_admin boolean DEFAULT false,
  p_device_id text DEFAULT NULL
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
    auth_id, tenant_id, full_name, nip, email, role, device_id,
    attendance_access, operational_access
  )
  VALUES (
    p_auth_id, v_tenant.id, trim(p_full_name), v_nip, lower(trim(p_email)),
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

GRANT EXECUTE ON FUNCTION public.resolve_tenant_registration_code(text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_profile_with_code(uuid, text, text, text, text, boolean, text) TO authenticated;

DROP POLICY IF EXISTS "Semua Bisa Cek Ketersediaan Tenant" ON public.tenants;
DROP POLICY IF EXISTS "tenant_select_scoped" ON public.tenants;
CREATE POLICY "tenant_select_scoped" ON public.tenants
FOR SELECT USING (
  public.get_my_role() = 'SUPER_ADMIN'
  OR id = public.get_my_tenant()
);

DROP POLICY IF EXISTS "Semua Bisa Baca Profil" ON public.profiles;
DROP POLICY IF EXISTS "Bisa Bikin Profil Sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Bisa Edit Profil Sendiri" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
FOR SELECT USING (
  public.get_my_role() = 'SUPER_ADMIN'
  OR auth_id = auth.uid()
  OR tenant_id = public.get_my_tenant()
);

DROP POLICY IF EXISTS "profiles_insert_self_employee" ON public.profiles;
CREATE POLICY "profiles_insert_self_employee" ON public.profiles
FOR INSERT WITH CHECK (
  auth_id = auth.uid()
  AND role = 'EMPLOYEE'
  AND tenant_id IS NOT NULL
);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_manage_tenant" ON public.profiles;
CREATE POLICY "profiles_admin_manage_tenant" ON public.profiles
FOR ALL USING (
  public.get_my_role() = 'SUPER_ADMIN'
  OR (public.get_my_role() = 'TENANT_ADMIN' AND tenant_id = public.get_my_tenant())
)
WITH CHECK (
  public.get_my_role() = 'SUPER_ADMIN'
  OR (public.get_my_role() = 'TENANT_ADMIN' AND tenant_id = public.get_my_tenant() AND role <> 'SUPER_ADMIN')
);

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.get_my_role();
BEGIN
  IF v_role = 'TENANT_ADMIN' THEN
    IF NEW.auth_id IS DISTINCT FROM OLD.auth_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.role = 'SUPER_ADMIN' THEN
      RAISE EXCEPTION 'Tenant admin tidak boleh mengubah tenant/auth atau membuat super admin';
    END IF;
  ELSIF v_role IS DISTINCT FROM 'SUPER_ADMIN' THEN
    IF NEW.auth_id IS DISTINCT FROM OLD.auth_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.operational_access IS DISTINCT FROM OLD.operational_access
      OR NEW.attendance_access IS DISTINCT FROM OLD.attendance_access THEN
      RAISE EXCEPTION 'Kolom keamanan profil hanya boleh diubah oleh admin berwenang';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_security_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_security_fields();

DROP POLICY IF EXISTS "Insert Audit Logs Bebas" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_scoped" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_scoped" ON public.audit_logs
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.get_my_role() = 'SUPER_ADMIN'
    OR tenant_id = public.get_my_tenant()
  )
);

DROP POLICY IF EXISTS "storage_documents_owner_upload" ON storage.objects;
CREATE POLICY "storage_documents_owner_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_documents_owner_update" ON storage.objects;
CREATE POLICY "storage_documents_owner_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_documents_owner_delete" ON storage.objects;
CREATE POLICY "storage_documents_owner_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;
