-- ==============================================================================
-- SAFE ADD ALL — Jangan hapus data yang sudah ada
-- Hanya nambah tabel & kolom BARU yang belum ada
-- AMAN dijalanin berulang kali (idempotent)
-- ==============================================================================
-- Cara jalanin: Copy-paste ke Supabase SQL Editor, RUN 1x
-- ==============================================================================

-- =====================
-- 1. SQL: add_features.sql
-- =====================
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) DEFAULT 'NATIONAL' CHECK (type IN ('NATIONAL', 'COMPANY', 'RELIGIOUS')),
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, date)
);

CREATE TABLE IF NOT EXISTS public.qr_attendance_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.qr_attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token_id UUID REFERENCES public.qr_attendance_tokens(id) ON DELETE SET NULL,
  action VARCHAR(20) DEFAULT 'CLOCK_IN',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE IF EXISTS public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qr_attendance_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qr_attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolasi Tenant - Holidays" ON public.company_holidays;
CREATE POLICY "Isolasi Tenant - Holidays" ON public.company_holidays
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - QR Tokens" ON public.qr_attendance_tokens;
CREATE POLICY "Isolasi Tenant - QR Tokens" ON public.qr_attendance_tokens
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - QR Logs" ON public.qr_attendance_logs;
CREATE POLICY "Isolasi Tenant - QR Logs" ON public.qr_attendance_logs
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Employee Read Holidays" ON public.company_holidays;
CREATE POLICY "Employee Read Holidays" ON public.company_holidays FOR SELECT USING (true);
DROP POLICY IF EXISTS "Employee Insert QR Logs" ON public.qr_attendance_logs;
CREATE POLICY "Employee Insert QR Logs" ON public.qr_attendance_logs FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Read QR Logs" ON public.qr_attendance_logs;
CREATE POLICY "Employee Read QR Logs" ON public.qr_attendance_logs FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Read QR Tokens" ON public.qr_attendance_tokens;
CREATE POLICY "Employee Read QR Tokens" ON public.qr_attendance_tokens FOR SELECT
  USING (tenant_id = public.get_my_tenant());

-- =====================
-- 2. SQL: add_enterprise.sql
-- =====================
CREATE TABLE IF NOT EXISTS public.company_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  asset_code VARCHAR(50) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('LAPTOP', 'PHONE', 'UNIFORM', 'VEHICLE', 'TOOL', 'OTHER')),
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_price NUMERIC(15,2),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, asset_code)
);

ALTER TABLE IF EXISTS public.company_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolasi Tenant - Assets" ON public.company_assets;
CREATE POLICY "Isolasi Tenant - Assets" ON public.company_assets
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Employee Lihat Asset Sendiri" ON public.company_assets;
CREATE POLICY "Employee Lihat Asset Sendiri" ON public.company_assets
  FOR SELECT USING (assigned_to IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- =====================
-- 3. SQL: add_enterprise_plus.sql
-- =====================
CREATE TABLE IF NOT EXISTS public.company_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(255),
  category VARCHAR(50) DEFAULT 'GATHERING' CHECK (category IN ('TRAINING', 'GATHERING', 'MEETING', 'HOLIDAY', 'BIRTHDAY', 'OTHER')),
  is_mandatory BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.company_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolasi Tenant - Events" ON public.company_events;
CREATE POLICY "Isolasi Tenant - Events" ON public.company_events
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Employee Read Events" ON public.company_events;
CREATE POLICY "Employee Read Events" ON public.company_events
  FOR SELECT USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- Kolom tambahan ke tenant_settings
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS overtime_rate_weekday NUMERIC DEFAULT 1.5;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS overtime_rate_holiday NUMERIC DEFAULT 2.0;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS bpjs_kesehatan_company NUMERIC DEFAULT 4;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan_company NUMERIC DEFAULT 3.7;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS pph21_method VARCHAR(20) DEFAULT 'TER' CHECK (pph21_method IN ('TER', 'GROSS_UP', 'NETTO'));
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS payday_date INT DEFAULT 25 CHECK (payday_date BETWEEN 1 AND 31);
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS use_attendance_deduction BOOLEAN DEFAULT false;

-- =====================
-- 4. SQL: add_hr_features.sql  
-- =====================
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  period_label VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kpi_score NUMERIC(5,2),
  behavioral_score NUMERIC(5,2),
  final_score NUMERIC(5,2),
  achievements TEXT,
  improvements TEXT,
  reviewer_notes TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'ONBOARDING' CHECK (category IN ('ONBOARDING', 'OFFBOARDING')),
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolasi Tenant - Reviews" ON public.performance_reviews;
CREATE POLICY "Isolasi Tenant - Reviews" ON public.performance_reviews
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Onboarding" ON public.onboarding_tasks;
CREATE POLICY "Isolasi Tenant - Onboarding" ON public.onboarding_tasks
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Employee Lihat Review Sendiri" ON public.performance_reviews;
CREATE POLICY "Employee Lihat Review Sendiri" ON public.performance_reviews
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Lihat Onboarding Sendiri" ON public.onboarding_tasks;
CREATE POLICY "Employee Lihat Onboarding Sendiri" ON public.onboarding_tasks
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- Trigger onboarding tasks (hanya buat kalo belum ada)
CREATE OR REPLACE FUNCTION public.handle_onboarding_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('EMPLOYEE', 'SUB_ADMIN') AND NEW.auth_id IS NOT NULL THEN
    INSERT INTO public.onboarding_tasks (tenant_id, user_id, task_name, category) VALUES
      (NEW.tenant_id, NEW.id, 'Lengkapi Data Pribadi (KTP, KK)', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Upload Foto Profil', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Lengkapi Data BPJS & NPWP', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Upload Dokumen Kontrak', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Pengikatan Perangkat (Device Binding)', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Orientasi & Pengenalan Tim', 'ONBOARDING');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_onboarding ON public.profiles;
CREATE TRIGGER on_profile_created_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_onboarding_tasks();

-- =====================
-- 5. SQL: add_hr_plus.sql
-- =====================
CREATE TABLE IF NOT EXISTS public.salary_revisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  previous_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  new_amount NUMERIC(15,2) NOT NULL,
  change_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  change_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.salary_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolasi Tenant - Salary Revisions" ON public.salary_revisions;
CREATE POLICY "Isolasi Tenant - Salary Revisions" ON public.salary_revisions
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Employee Lihat Revisions Sendiri" ON public.salary_revisions;
CREATE POLICY "Employee Lihat Revisions Sendiri" ON public.salary_revisions
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- =====================
-- 6. SQL: add_knowledge.sql
-- =====================
CREATE TABLE IF NOT EXISTS public.company_policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('HR', 'FINANCE', 'OPERATIONAL', 'IT', 'SAFETY', 'GENERAL')),
  content TEXT,
  file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  version VARCHAR(20) DEFAULT '1.0',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.company_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolasi Tenant - Policies" ON public.company_policies;
CREATE POLICY "Isolasi Tenant - Policies" ON public.company_policies
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Employee Read Policies" ON public.company_policies;
CREATE POLICY "Employee Read Policies" ON public.company_policies
  FOR SELECT USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- Storage bucket policies
INSERT INTO storage.buckets (id, name, public) VALUES ('policies', 'policies', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Read Policies" ON storage.objects;
CREATE POLICY "Public Read Policies" ON storage.objects FOR SELECT USING (bucket_id = 'policies');
DROP POLICY IF EXISTS "Auth Upload Policies" ON storage.objects;
CREATE POLICY "Auth Upload Policies" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'policies' AND auth.role() = 'authenticated');

-- =====================
-- 7. SQL: add_banners.sql
-- =====================
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS banners TEXT[] DEFAULT '{}';
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS banner_interval INTEGER DEFAULT 5;

INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Read Banners" ON storage.objects;
CREATE POLICY "Public Read Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "Auth Upload Banners" ON storage.objects;
CREATE POLICY "Auth Upload Banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth Delete Banners" ON storage.objects;
CREATE POLICY "Auth Delete Banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND auth.role() = 'authenticated');

-- =====================
-- 8. SQL: add_final.sql
-- =====================
CREATE TABLE IF NOT EXISTS public.system_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_sender_name VARCHAR(255) DEFAULT 'SI PRESENSI',
  email_sender_address VARCHAR(255),
  email_provider VARCHAR(50) DEFAULT 'smtp' CHECK (email_provider IN ('smtp', 'sendgrid', 'mailgun')),
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 587,
  smtp_username VARCHAR(255),
  smtp_password TEXT,
  smtp_encryption VARCHAR(20) DEFAULT 'tls',
  whatsapp_api_key TEXT,
  whatsapp_api_url TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.system_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolasi Tenant - System Configs" ON public.system_configs;
CREATE POLICY "Isolasi Tenant - System Configs" ON public.system_configs
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- =====================
-- 9. SQL: add_payroll_tables.sql (PAYROLL CORE)
-- =====================
CREATE TABLE IF NOT EXISTS public.salary_components (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ALLOWANCE', 'DEDUCTION')),
  category VARCHAR(50) DEFAULT 'FIXED',
  is_taxable BOOLEAN DEFAULT true,
  is_bpjs BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.employee_salaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  component_id UUID REFERENCES public.salary_components(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, component_id, effective_date)
);

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'LOCKED', 'PAID')),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS public.payroll_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  period_id UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  component_id UUID REFERENCES public.salary_components(id) ON DELETE CASCADE,
  component_code VARCHAR(50),
  component_name VARCHAR(200),
  component_type VARCHAR(20),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payroll_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  period_id UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  total_allowance NUMERIC(15,2) DEFAULT 0,
  total_deduction NUMERIC(15,2) DEFAULT 0,
  take_home_pay NUMERIC(15,2) DEFAULT 0,
  total_days_worked INT DEFAULT 0,
  total_overtime_hours NUMERIC(10,2) DEFAULT 0,
  total_late_minutes INT DEFAULT 0,
  total_absence_days INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(period_id, user_id)
);

ALTER TABLE IF EXISTS public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolasi Tenant - Salary Components" ON public.salary_components;
CREATE POLICY "Isolasi Tenant - Salary Components" ON public.salary_components
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Employee Salaries" ON public.employee_salaries;
CREATE POLICY "Isolasi Tenant - Employee Salaries" ON public.employee_salaries
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Payroll Periods" ON public.payroll_periods;
CREATE POLICY "Isolasi Tenant - Payroll Periods" ON public.payroll_periods
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Payroll Results" ON public.payroll_results;
CREATE POLICY "Isolasi Tenant - Payroll Results" ON public.payroll_results
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Payroll Summary" ON public.payroll_summary;
CREATE POLICY "Isolasi Tenant - Payroll Summary" ON public.payroll_summary
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Employee Lihat Payroll Sendiri" ON public.payroll_summary;
CREATE POLICY "Employee Lihat Payroll Sendiri" ON public.payroll_summary
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Lihat Detail Payroll" ON public.payroll_results;
CREATE POLICY "Employee Lihat Detail Payroll" ON public.payroll_results
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- Kolom tambahan payroll_settings
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS overtime_rate_weekday NUMERIC DEFAULT 1.5;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS overtime_rate_holiday NUMERIC DEFAULT 2.0;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS night_shift_rate NUMERIC DEFAULT 1.5;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS overtime_calculation VARCHAR(20) DEFAULT 'daily';
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS bpjs_kesehatan_max NUMERIC DEFAULT 12000000;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS bpjs_jht_max NUMERIC DEFAULT 106584000;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS bpjs_jp_max NUMERIC DEFAULT 106584000;

-- Default payroll components trigger
CREATE OR REPLACE FUNCTION public.handle_new_tenant_payroll()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.salary_components (tenant_id, code, name, type, category, is_taxable, is_bpjs) VALUES
    (NEW.id, 'GP', 'Gaji Pokok', 'ALLOWANCE', 'FIXED', true, true),
    (NEW.id, 'TJ', 'Tunjangan Jabatan', 'ALLOWANCE', 'FIXED', true, true),
    (NEW.id, 'TM', 'Tunjangan Makan', 'ALLOWANCE', 'FIXED', false, false),
    (NEW.id, 'TT', 'Tunjangan Transport', 'ALLOWANCE', 'FIXED', false, false),
    (NEW.id, 'LEMBUR', 'Lembur', 'ALLOWANCE', 'VARIABLE', true, true),
    (NEW.id, 'BPJS_KES', 'BPJS Kesehatan', 'DEDUCTION', 'FIXED', false, false),
    (NEW.id, 'BPJS_TK', 'BPJS Ketenagakerjaan', 'DEDUCTION', 'FIXED', false, false),
    (NEW.id, 'PPH21', 'PPh 21', 'DEDUCTION', 'FIXED', false, false),
    (NEW.id, 'PINJAMAN', 'Potongan Pinjaman', 'DEDUCTION', 'FIXED', false, false),
    (NEW.id, 'DENDA', 'Denda Keterlambatan', 'DEDUCTION', 'VARIABLE', false, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tenant_created_payroll ON public.tenants;
CREATE TRIGGER on_tenant_created_payroll
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant_payroll();

-- =====================
-- 10. SQL: add_payroll_fase2.sql (LOANS, REIMBURSEMENTS, LEAVE BALANCES)
-- =====================
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  installment_count INT NOT NULL DEFAULT 1,
  monthly_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(15,2) NOT NULL,
  purpose VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'PAID', 'REJECTED')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.reimbursements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('MEDICAL', 'TRANSPORT', 'MEAL', 'TRAINING', 'SUPPLIES', 'ENTERTAINMENT', 'OTHER')),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_in_payroll BOOLEAN DEFAULT false,
  period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  total_days INT NOT NULL DEFAULT 12,
  used_days INT NOT NULL DEFAULT 0,
  pending_days INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, year)
);

ALTER TABLE IF EXISTS public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolasi Tenant - Loans" ON public.loans;
CREATE POLICY "Isolasi Tenant - Loans" ON public.loans
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Reimbursements" ON public.reimbursements;
CREATE POLICY "Isolasi Tenant - Reimbursements" ON public.reimbursements
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
DROP POLICY IF EXISTS "Isolasi Tenant - Leave Balances" ON public.leave_balances;
CREATE POLICY "Isolasi Tenant - Leave Balances" ON public.leave_balances
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Employee Loans Own" ON public.loans;
CREATE POLICY "Employee Loans Own" ON public.loans FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Insert Loans" ON public.loans;
CREATE POLICY "Employee Insert Loans" ON public.loans FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Reimbursements Own" ON public.reimbursements;
CREATE POLICY "Employee Reimbursements Own" ON public.reimbursements FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Insert Reimbursements" ON public.reimbursements;
CREATE POLICY "Employee Insert Reimbursements" ON public.reimbursements FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Employee Leave Balance Own" ON public.leave_balances;
CREATE POLICY "Employee Leave Balance Own" ON public.leave_balances FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- Trigger: auto-create leave_balance
CREATE OR REPLACE FUNCTION public.handle_annual_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.leave_balances (tenant_id, user_id, year, total_days)
    VALUES (NEW.tenant_id, NEW.id, EXTRACT(YEAR FROM CURRENT_DATE), 12)
    ON CONFLICT (user_id, year) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_leave ON public.profiles;
CREATE TRIGGER on_profile_created_leave
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_annual_leave_balance();

-- Trigger: update leave_balance when leave approved
CREATE OR REPLACE FUNCTION public.handle_leave_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' AND NEW.type = 'ANNUAL' THEN
    UPDATE public.leave_balances
    SET used_days = used_days + GREATEST(1, (NEW.end_date - NEW.start_date + 1)),
        pending_days = pending_days - GREATEST(1, (NEW.end_date - NEW.start_date + 1))
    WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_leave_request_approved ON public.leave_requests;
CREATE TRIGGER on_leave_request_approved
  AFTER UPDATE OF status ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_leave_approved();

-- ==============================================================================
-- SELESAI — Semua tabel & kolom baru sudah ditambahkan dengan AMAN
-- Tidak ada data yang terhapus
-- ==============================================================================
