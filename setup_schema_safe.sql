-- ==============================================================================
-- SAFE SCHEMA SETUP - AMAN UNTUK DATA EXISTING
-- ==============================================================================
-- Gunakan script ini jika database sudah pernah diisi data.
-- Tidak akan menghapus atau merusak data yang sudah ada.
-- ==============================================================================

-- EKSTENSI
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- ==============================================================================
-- TABEL INTI
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'Standard',
  is_active BOOLEAN DEFAULT true,
  days_left INTEGER DEFAULT 365,
  max_users INTEGER DEFAULT 100,
  activation_code VARCHAR(100),
  admin_code VARCHAR(100),
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(50),
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  require_device_binding BOOLEAN DEFAULT false,
  allow_offline_attendance BOOLEAN DEFAULT false,
  work_days JSONB DEFAULT '["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]'::jsonb,
  check_in_time TIME DEFAULT '08:00',
  check_out_time TIME DEFAULT '17:00',
  grace_period_minutes INTEGER DEFAULT 15,
  late_penalty_fee NUMERIC DEFAULT 0,
  auto_approval_toggle BOOLEAN DEFAULT false,
  delegated_approval BOOLEAN DEFAULT false,
  audit_retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  nip VARCHAR(50) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  gender VARCHAR(20),
  birth_date DATE,
  profile_photo TEXT,
  role VARCHAR(50) DEFAULT 'EMPLOYEE',
  position VARCHAR(100),
  device_id TEXT,
  attendance_access BOOLEAN DEFAULT true,
  operational_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.employee_hris_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ktp_number VARCHAR(50),
  birth_place VARCHAR(100),
  religion VARCHAR(50),
  marriage_status VARCHAR(20),
  children_count INT DEFAULT 0,
  tax_status VARCHAR(20),
  mother_name VARCHAR(150),
  education_level VARCHAR(50),
  major VARCHAR(100),
  school_name VARCHAR(150),
  join_date DATE,
  employee_status VARCHAR(50),
  contract_end_date DATE,
  permanent_date DATE,
  resign_date DATE,
  kk_number VARCHAR(50),
  npwp_number VARCHAR(50),
  passport_number VARCHAR(50),
  bpjs_tk_number VARCHAR(50),
  bpjs_kes_number VARCHAR(50),
  other_insurance_name VARCHAR(100),
  other_insurance_number VARCHAR(50),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(100),
  bank_account_name VARCHAR(150),
  bank_branch VARCHAR(100),
  ktp_address TEXT,
  postal_code VARCHAR(20),
  domicile_address TEXT,
  mobile_phone VARCHAR(50),
  emergency_contact_name VARCHAR(150),
  emergency_contact_relation VARCHAR(50),
  emergency_contact_number VARCHAR(50),
  shirt_size VARCHAR(10),
  pants_size VARCHAR(10),
  shoes_size VARCHAR(10),
  kta_number VARCHAR(100),
  certificate_number VARCHAR(100),
  certificate_issued_date DATE,
  certificate_expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TABEL OPERASIONAL
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.master_shifts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  shift_code VARCHAR(50) NOT NULL,
  shift_name VARCHAR(100) NOT NULL,
  time_in TIME,
  time_out TIME,
  is_cross_day BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bpjs_kesehatan NUMERIC DEFAULT 1,
  bpjs_ketenagakerjaan NUMERIC DEFAULT 2,
  use_pph21 BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  stage_number INTEGER NOT NULL,
  role VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES public.master_shifts(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  distance_meters NUMERIC,
  photo_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_shift_swap BOOLEAN DEFAULT false,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_date DATE,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TRIGGER & FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_tenant() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenant_settings (tenant_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

CREATE OR REPLACE FUNCTION public.handle_registration_link()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM public.profiles 
  WHERE nip = NEW.nip AND auth_id IS NULL LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.profiles
    SET auth_id = NEW.auth_id,
        full_name = COALESCE(NEW.full_name, full_name),
        email = COALESCE(NEW.email, email),
        device_id = COALESCE(NEW.device_id, device_id),
        profile_photo = COALESCE(NEW.profile_photo, profile_photo)
    WHERE id = v_existing_id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_registration_link ON public.profiles;
CREATE TRIGGER on_registration_link
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_registration_link();

-- ==============================================================================
-- FUNGSI HELPER RLS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_tenant() RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_email_by_nip(p_nip text)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE nip = p_nip LIMIT 1;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- RLS POLICIES (Hanya dijalankan jika belum ada)
-- ==============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Tenants
DROP POLICY IF EXISTS "SuperAdmin Select Tenants" ON public.tenants;
CREATE POLICY "SuperAdmin Select Tenants" ON public.tenants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
DROP POLICY IF EXISTS "SuperAdmin Insert Tenants" ON public.tenants;
CREATE POLICY "SuperAdmin Insert Tenants" ON public.tenants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
DROP POLICY IF EXISTS "SuperAdmin Update Tenants" ON public.tenants;
CREATE POLICY "SuperAdmin Update Tenants" ON public.tenants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
DROP POLICY IF EXISTS "SuperAdmin Delete Tenants" ON public.tenants;
CREATE POLICY "SuperAdmin Delete Tenants" ON public.tenants FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
DROP POLICY IF EXISTS "Semua Bisa Cek Ketersediaan Tenant" ON public.tenants;
CREATE POLICY "Semua Bisa Cek Ketersediaan Tenant" ON public.tenants FOR SELECT USING (true);
DROP POLICY IF EXISTS "TenantAdmin Update Miliknya" ON public.tenants;
CREATE POLICY "TenantAdmin Update Miliknya" ON public.tenants FOR UPDATE USING (id = public.get_my_tenant());

-- Profiles
DROP POLICY IF EXISTS "Semua Bisa Baca Profil" ON public.profiles;
CREATE POLICY "Semua Bisa Baca Profil" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Bisa Bikin Profil Sendiri" ON public.profiles;
CREATE POLICY "Bisa Bikin Profil Sendiri" ON public.profiles FOR INSERT WITH CHECK (auth_id = auth.uid());
DROP POLICY IF EXISTS "Bisa Edit Profil Sendiri" ON public.profiles;
CREATE POLICY "Bisa Edit Profil Sendiri" ON public.profiles FOR UPDATE USING (auth_id = auth.uid());
DROP POLICY IF EXISTS "SuperAdmin Akses Penuh Profil" ON public.profiles;
CREATE POLICY "SuperAdmin Akses Penuh Profil" ON public.profiles FOR ALL USING (public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "TenantAdmin Kelola Pegawai" ON public.profiles;
CREATE POLICY "TenantAdmin Kelola Pegawai" ON public.profiles FOR ALL USING (tenant_id = public.get_my_tenant() AND public.get_my_role() = 'TENANT_ADMIN');

-- Isolasi Tenant
DROP POLICY IF EXISTS "Isolasi Tenant - Projects" ON public.projects;
CREATE POLICY "Isolasi Tenant - Projects" ON public.projects FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Divisions" ON public.divisions;
CREATE POLICY "Isolasi Tenant - Divisions" ON public.divisions FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Settings" ON public.tenant_settings;
CREATE POLICY "Isolasi Tenant - Settings" ON public.tenant_settings FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Master Shifts" ON public.master_shifts;
CREATE POLICY "Isolasi Tenant - Master Shifts" ON public.master_shifts FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Payroll Settings" ON public.payroll_settings;
CREATE POLICY "Isolasi Tenant - Payroll Settings" ON public.payroll_settings FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Approval Workflows" ON public.approval_workflows;
CREATE POLICY "Isolasi Tenant - Approval Workflows" ON public.approval_workflows FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Announcements" ON public.announcements;
CREATE POLICY "Isolasi Tenant - Announcements" ON public.announcements FOR SELECT USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Announcements Admin" ON public.announcements;
CREATE POLICY "Isolasi Tenant - Announcements Admin" ON public.announcements FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

-- Transaksional
DROP POLICY IF EXISTS "Pegawai Kelola Cuti Sendiri" ON public.leave_requests;
CREATE POLICY "Pegawai Kelola Cuti Sendiri" ON public.leave_requests FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Admin Lihat Cuti Tenant" ON public.leave_requests;
CREATE POLICY "Admin Lihat Cuti Tenant" ON public.leave_requests FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Pegawai Kelola Dokumen Sendiri" ON public.employee_documents;
CREATE POLICY "Pegawai Kelola Dokumen Sendiri" ON public.employee_documents FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Admin Lihat Dokumen Tenant" ON public.employee_documents;
CREATE POLICY "Admin Lihat Dokumen Tenant" ON public.employee_documents FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Pegawai Lihat Jadwal" ON public.user_schedules;
CREATE POLICY "Pegawai Lihat Jadwal" ON public.user_schedules FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Admin Kelola Jadwal Tenant" ON public.user_schedules;
CREATE POLICY "Admin Kelola Jadwal Tenant" ON public.user_schedules FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Pegawai Kelola Absensi Sendiri" ON public.attendance_logs;
CREATE POLICY "Pegawai Kelola Absensi Sendiri" ON public.attendance_logs FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Admin Lihat Absensi Tenant" ON public.attendance_logs;
CREATE POLICY "Admin Lihat Absensi Tenant" ON public.attendance_logs FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

-- Audit Logs
DROP POLICY IF EXISTS "Insert Audit Logs Bebas" ON public.audit_logs;
CREATE POLICY "Insert Audit Logs Bebas" ON public.audit_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "SuperAdmin Lihat Logs" ON public.audit_logs;
CREATE POLICY "SuperAdmin Lihat Logs" ON public.audit_logs FOR SELECT USING (public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Admin Lihat Logs Tenant" ON public.audit_logs;
CREATE POLICY "Admin Lihat Logs Tenant" ON public.audit_logs FOR SELECT USING (
  tenant_id = public.get_my_tenant() 
  AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')
);

-- ==============================================================================
-- SETUP SUPER ADMIN (ganti email dengan email kamu)
-- ==============================================================================
DO $$
DECLARE
  v_auth_id UUID;
  v_email TEXT := 'richardpl.meha@gmail.com';
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.profiles (auth_id, email, full_name, role, attendance_access, operational_access)
    VALUES (v_auth_id, v_email, 'RICHARD MEHA GOD MODE', 'SUPER_ADMIN', true, true)
    ON CONFLICT (auth_id) DO UPDATE 
    SET role = 'SUPER_ADMIN', attendance_access = true, operational_access = true, full_name = 'RICHARD MEHA GOD MODE';
  ELSE
    RAISE WARNING 'User % not found in auth.users. Sign up first, then run this script again.', v_email;
  END IF;
END;
$$;
