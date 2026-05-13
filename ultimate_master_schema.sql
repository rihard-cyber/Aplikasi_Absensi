-- ==============================================================================
-- ULTIMATE MASTER SCHEMA V4.0 - ENTERPRISE GOD MODE EDITION
-- ==============================================================================
-- DILARANG MENGUBAH URUTAN EKSEKUSI. SCRIPT INI DIDESAIN UNTUK DIJALANKAN 1X KLIK
-- ==============================================================================

-- 1. BERSIHKAN SEMUA (CLEAN SLATE)
-- Menghapus skema public lama agar tidak ada konflik
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Kembalikan Ijin Dasar ke Skema Public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 2. EKSTENSI DATABASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- ==============================================================================
-- TAHAP 1: PEMBUATAN TABEL INTI (CORE TABLES)
-- ==============================================================================

-- [A] TABEL TENANT (PERUSAHAAN)
CREATE TABLE public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'Standard',
  is_active BOOLEAN DEFAULT true,
  days_left INTEGER DEFAULT 365,
  max_users INTEGER DEFAULT 100,
  activation_code VARCHAR(100),   -- Kode untuk pendaftaran KARYAWAN (prefix: SI-)
  admin_code VARCHAR(100),         -- Kode Lisensi untuk pendaftaran ADMIN TENANT (prefix: ADM-), one-time use
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(50),
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [B] TABEL PENGATURAN TENANT
CREATE TABLE public.tenant_settings (
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

-- [C] TABEL PROYEK / LOKASI KERJA
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20), -- Kode unik per cabang (contoh: KMC, BKP, KMP)
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [D] TABEL DIVISI
CREATE TABLE public.divisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [E] TABEL PROFIL PENGGUNA (PEGAWAI & ADMIN)
CREATE TABLE public.profiles (
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
  role VARCHAR(50) DEFAULT 'EMPLOYEE', -- SUPER_ADMIN, TENANT_ADMIN, SUB_ADMIN, EMPLOYEE
  position VARCHAR(100), -- Jabatan (Security, Staff, Supervisor, dll)
  device_id TEXT, -- Untuk fitur penguncian perangkat
  attendance_access BOOLEAN DEFAULT true,
  operational_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [E2] TABEL DATA PRIBADI HRIS KARYAWAN (EXTENDED PROFILE)
CREATE TABLE public.employee_hris_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Data Pribadi Utama
  ktp_number VARCHAR(50),
  birth_place VARCHAR(100),
  religion VARCHAR(50),
  marriage_status VARCHAR(20), -- K, TK
  children_count INT DEFAULT 0,
  tax_status VARCHAR(20), -- K-0, K-1, TK-0, dll
  mother_name VARCHAR(150),
  
  -- Pendidikan
  education_level VARCHAR(50),
  major VARCHAR(100),
  school_name VARCHAR(150),
  
  -- Status Kepegawaian & Kontrak
  join_date DATE,
  employee_status VARCHAR(50), -- PKWT, PKWTT, TETAP, INTERN
  contract_end_date DATE,
  permanent_date DATE,
  resign_date DATE,
  
  -- Dokumen Identitas Lain
  kk_number VARCHAR(50),
  npwp_number VARCHAR(50),
  passport_number VARCHAR(50),
  
  -- BPJS & Asuransi
  bpjs_tk_number VARCHAR(50),
  bpjs_kes_number VARCHAR(50),
  other_insurance_name VARCHAR(100),
  other_insurance_number VARCHAR(50),
  
  -- Data Bank
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(100),
  bank_account_name VARCHAR(150),
  bank_branch VARCHAR(100),
  
  -- Alamat & Kontak
  ktp_address TEXT,
  postal_code VARCHAR(20),
  domicile_address TEXT,
  mobile_phone VARCHAR(50), -- NO HP
  emergency_contact_name VARCHAR(150),
  emergency_contact_relation VARCHAR(50),
  emergency_contact_number VARCHAR(50),
  
  -- Seragam & Perlengkapan
  shirt_size VARCHAR(10),
  pants_size VARCHAR(10),
  shoes_size VARCHAR(10),
  
  -- Spesifik Satpam / Security
  kta_number VARCHAR(100),
  certificate_number VARCHAR(100),
  certificate_issued_date DATE,
  certificate_expiry_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- ==============================================================================
-- TAHAP 2: TABEL OPERASIONAL (OPERATIONAL TABLES)
-- ==============================================================================

-- [F] KAMUS SHIFT KERJA
CREATE TABLE public.master_shifts (
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

-- [F2] TABEL PENGATURAN GAJI (PAYROLL SETTINGS)
CREATE TABLE public.payroll_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bpjs_kesehatan NUMERIC DEFAULT 1,
  bpjs_ketenagakerjaan NUMERIC DEFAULT 2,
  use_pph21 BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [F3] TABEL ALUR PERSETUJUAN (APPROVAL WORKFLOWS)
CREATE TABLE public.approval_workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  stage_number INTEGER NOT NULL,
  role VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [G] JADWAL PEGAWAI (PENUGASAN SHIFT)
CREATE TABLE public.user_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES public.master_shifts(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, date) -- Pegawai hanya boleh punya 1 shift dalam 1 hari
);

-- [G2] LOG ABSENSI (ATTENDANCE LOGS)
CREATE TABLE public.attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL, -- CLOCK_IN, CLOCK_OUT
  status VARCHAR(50) NOT NULL, -- ONTIME, LATE, OUT_OF_RANGE
  distance_meters NUMERIC,
  photo_url TEXT, -- Link foto selfie base64 atau storage url
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [H] PENGAJUAN CUTI & IZIN (FORM REQUEST PEGAWAI)
CREATE TABLE public.leave_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL, -- SICK, ANNUAL, UNPAID, dll
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  file_url TEXT, -- Link file PDF/Gambar di Storage Bucket
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_shift_swap BOOLEAN DEFAULT false,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_date DATE,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [I] DOKUMEN PEGAWAI (UPLOAD FILE FITUR)
CREATE TABLE public.employee_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type VARCHAR(100) NOT NULL, -- KTP, KONTRAK, SERTIFIKAT
  file_url TEXT NOT NULL, -- Link file di Storage Bucket
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [J] PUSAT PENGUMUMAN (BROADCAST)
CREATE TABLE public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- Jika null berarti semua cabang
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [K] JEJAK AUDIT (AUDIT LOGS)
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TAHAP 3: STORAGE BUCKETS (FILE UPLOADS)
-- ==============================================================================

-- Buat Ember untuk Logo Perusahaan
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Buat Ember untuk Dokumen Cuti & Pegawai
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Akses Storage (Semua orang bisa baca/download)
DROP POLICY IF EXISTS "Public Read Company Assets" ON storage.objects;
CREATE POLICY "Public Read Company Assets" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Public Read Documents" ON storage.objects;
CREATE POLICY "Public Read Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

-- Kebijakan Akses Storage (Hanya yang login bisa upload)
DROP POLICY IF EXISTS "Auth Upload Company Assets" ON storage.objects;
CREATE POLICY "Auth Upload Company Assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Upload Documents" ON storage.objects;
CREATE POLICY "Auth Upload Documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ==============================================================================
-- TAHAP 4: OTOMATISASI TRIGGER (AUTO-MAGIC)
-- ==============================================================================

-- Fungsi Otomatis Membuat Pengaturan Default Saat Tenant Baru Dibuat
CREATE OR REPLACE FUNCTION public.handle_new_tenant() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenant_settings (tenant_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

-- Fungsi Auto-Link Registrasi: INSERT profile jadi UPDATE jika nip sudah ada
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

CREATE TRIGGER on_registration_link
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_registration_link();

-- ==============================================================================
-- TAHAP 5: KEAMANAN BERLAPIS (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Fungsi Helper Super Aman (Tanpa Looping)
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_tenant() RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Fungsi untuk Login menggunakan NIP
CREATE OR REPLACE FUNCTION public.get_email_by_nip(p_nip text)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE nip = p_nip LIMIT 1;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AKTIFKAN RLS UNTUK SEMUA TABEL
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

-- ------------------------------------------------------------------------------
-- RLS POLICIES (ATURAN SATPAM)
-- ------------------------------------------------------------------------------

-- 1. TABEL TENANTS (Hanya Super Admin yang bisa mengelola semua, lainnya hanya lihat miliknya)
CREATE POLICY "SuperAdmin Select Tenants" ON public.tenants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
CREATE POLICY "SuperAdmin Insert Tenants" ON public.tenants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
CREATE POLICY "SuperAdmin Update Tenants" ON public.tenants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
CREATE POLICY "SuperAdmin Delete Tenants" ON public.tenants FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
);
CREATE POLICY "Semua Bisa Cek Ketersediaan Tenant" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "TenantAdmin Update Miliknya" ON public.tenants FOR UPDATE USING (id = public.get_my_tenant());

-- 2. TABEL PROFILES
CREATE POLICY "Semua Bisa Baca Profil" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Bisa Bikin Profil Sendiri" ON public.profiles FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "Bisa Edit Profil Sendiri" ON public.profiles FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "SuperAdmin Akses Penuh Profil" ON public.profiles FOR ALL USING (public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "TenantAdmin Kelola Pegawai" ON public.profiles FOR ALL USING (tenant_id = public.get_my_tenant() AND public.get_my_role() = 'TENANT_ADMIN');

-- 3. TABEL ISOLASI TENANT (Projects, Divisions, Settings, Shifts, Announcements)
-- Kebijakan ini berlaku untuk SEMUA tabel operasional: Hanya bisa diakses jika tenant_id cocok
CREATE POLICY "Isolasi Tenant - Projects" ON public.projects FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Divisions" ON public.divisions FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Settings" ON public.tenant_settings FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Master Shifts" ON public.master_shifts FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Payroll Settings" ON public.payroll_settings FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Approval Workflows" ON public.approval_workflows FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Announcements" ON public.announcements FOR SELECT USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Announcements Admin" ON public.announcements FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

-- 4. TABEL TRANSAKSIONAL (Leave Requests, Documents, Schedules)
-- Pegawai hanya bisa baca/tulis miliknya. Admin bisa baca semua di perusahaannya.
CREATE POLICY "Pegawai Kelola Cuti Sendiri" ON public.leave_requests FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Admin Lihat Cuti Tenant" ON public.leave_requests FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Pegawai Kelola Dokumen Sendiri" ON public.employee_documents FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Admin Lihat Dokumen Tenant" ON public.employee_documents FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Pegawai Lihat Jadwal" ON public.user_schedules FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Admin Kelola Jadwal Tenant" ON public.user_schedules FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Pegawai Kelola Absensi Sendiri" ON public.attendance_logs FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Admin Lihat Absensi Tenant" ON public.attendance_logs FOR ALL USING ((tenant_id = public.get_my_tenant() AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')) OR public.get_my_role() = 'SUPER_ADMIN');

-- 5. TABEL AUDIT LOGS (SuperAdmin lihat semua, Admin Tenant lihat miliknya)
CREATE POLICY "Insert Audit Logs Bebas" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "SuperAdmin Lihat Logs" ON public.audit_logs FOR SELECT USING (public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Admin Lihat Logs Tenant" ON public.audit_logs FOR SELECT USING (
  tenant_id = public.get_my_tenant() 
  AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')
);


-- ==============================================================================
-- TAHAP 6: BYPASS GOD MODE UNTUK AKUN KAMU (FINALISASI)
-- ==============================================================================

-- Ini akan memastikan akun kamu tidak kena RLS saat pertama kali masuk!
-- Mencari auth_id real dari auth.users berdasarkan email (tidak hardcoded)
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
    RAISE WARNING 'User % not found in auth.users. Sign up first, then run fix_rls_tenant_uuid.sql', v_email;
  END IF;
END;
$$;

-- ==============================================================================
-- TAHAP 7: STORAGE BUCKET AVATARS & POLICIES
-- ==============================================================================

-- Buat Ember untuk Foto Profil (Avatar)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
-- Berikan akses ke SEMUA orang untuk melihat foto profil
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
CREATE POLICY "Public Access to Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Berikan izin bagi User yang sudah login untuk mengupload foto ke folder mereka sendiri
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Berikan izin bagi User untuk mengupdate/mengganti foto lama mereka
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Berikan izin bagi User untuk menghapus foto mereka sendiri
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);
