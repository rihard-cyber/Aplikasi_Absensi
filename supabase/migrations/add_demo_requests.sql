-- ==============================================================================
-- FITUR DEMO REQUEST (Opsi 3 Hybrid — Minta Demo)
-- ==============================================================================
-- Memungkinkan calon pengguna mengajukan demo tenant.
-- Super Admin menyetujui/menolak secara manual.
-- ==============================================================================

-- 1. TABLE: demo_requests
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  employee_count INTEGER DEFAULT 10,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  admin_notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Siapa pun bisa INSERT demo_requests (tanpa login)
CREATE POLICY "Siapa pun Bisa Ajukan Demo" ON public.demo_requests
  FOR INSERT WITH CHECK (true);

-- Hanya SUPER_ADMIN yang bisa SELECT (melihat semua request)
CREATE POLICY "Super Admin Baca Semua Demo Request" ON public.demo_requests
  FOR SELECT USING (public.get_my_role() = 'SUPER_ADMIN');

-- Hanya SUPER_ADMIN yang bisa UPDATE (setujui/tolak)
CREATE POLICY "Super Admin Proses Demo Request" ON public.demo_requests
  FOR UPDATE USING (public.get_my_role() = 'SUPER_ADMIN');

-- 2. FUNCTION: submit_demo_request
CREATE OR REPLACE FUNCTION public.submit_demo_request(
  p_name VARCHAR,
  p_company_name VARCHAR,
  p_email VARCHAR,
  p_phone VARCHAR DEFAULT NULL,
  p_employee_count INTEGER DEFAULT 10,
  p_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Nama wajib diisi';
  END IF;
  IF p_company_name IS NULL OR p_company_name = '' THEN
    RAISE EXCEPTION 'Nama perusahaan wajib diisi';
  END IF;
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email wajib diisi';
  END IF;

  INSERT INTO public.demo_requests (name, company_name, email, phone, employee_count, message)
  VALUES (p_name, p_company_name, p_email, p_phone, p_employee_count, p_message)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCTION: get_pending_demo_requests
CREATE OR REPLACE FUNCTION public.get_pending_demo_requests()
RETURNS SETOF public.demo_requests AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.demo_requests
    WHERE status = 'pending'
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCTION: approve_demo_request
CREATE OR REPLACE FUNCTION public.approve_demo_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS TABLE(
  tenant_id UUID,
  activation_code VARCHAR,
  company_name VARCHAR
) AS $$
DECLARE
  v_req public.demo_requests;
  v_tenant_id UUID;
  v_code VARCHAR;
BEGIN
  -- Cek apakah request ada dan masih pending
  SELECT * INTO v_req FROM public.demo_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demo request tidak ditemukan';
  END IF;
  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'Demo request sudah diproses (status: %)', v_req.status;
  END IF;

  -- Generate activation code
  v_code := 'DM-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  -- Buat tenant demo
  INSERT INTO public.tenants (
    name, tier, is_active, days_left, max_users,
    activation_code, admin_code
  ) VALUES (
    v_req.company_name, 'Demo', true, 14, 20,
    v_code, v_code
  ) RETURNING id INTO v_tenant_id;

  -- Update demo request
  UPDATE public.demo_requests
  SET
    status = 'approved',
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    processed_by = (SELECT id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1),
    processed_at = now(),
    tenant_id = v_tenant_id,
    expires_at = now() + INTERVAL '14 days'
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_tenant_id, v_code, v_req.company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION: reject_demo_request
CREATE OR REPLACE FUNCTION public.reject_demo_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_req public.demo_requests;
BEGIN
  SELECT * INTO v_req FROM public.demo_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demo request tidak ditemukan';
  END IF;
  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'Demo request sudah diproses (status: %)', v_req.status;
  END IF;

  UPDATE public.demo_requests
  SET
    status = 'rejected',
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    processed_by = (SELECT id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1),
    processed_at = now()
  WHERE id = p_request_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCTION: cleanup_expired_demos
CREATE OR REPLACE FUNCTION public.cleanup_expired_demos()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.demo_requests
    WHERE status = 'approved' AND expires_at < now()
  LOOP
    -- Nonaktifkan tenant
    UPDATE public.tenants SET is_active = false WHERE id = r.tenant_id;
    -- Tandai request expired
    UPDATE public.demo_requests SET status = 'expired' WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
