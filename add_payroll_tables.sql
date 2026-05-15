-- ==============================================================================
-- PAYROLL MODULE v1.0 - FASE 1: Payroll Core
-- Eksekusi di Supabase SQL Editor setelah schema utama
-- ==============================================================================

-- [L] MASTER KOMPONEN GAJI
CREATE TABLE public.salary_components (
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

-- [M] STRUKTUR GAJI PER KARYAWAN
CREATE TABLE public.employee_salaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  component_id UUID REFERENCES public.salary_components(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, component_id, effective_date)
);

-- [N] PERIODE PAYROLL
CREATE TABLE public.payroll_periods (
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

-- [O] HASIL PERHITUNGAN PAYROLL
CREATE TABLE public.payroll_results (
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

-- [P] SUMMARY PAYROLL PER KARYAWAN PER PERIODE
CREATE TABLE public.payroll_summary (
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

-- RLS
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_summary ENABLE ROW LEVEL SECURITY;

-- Isolasi Tenant
CREATE POLICY "Isolasi Tenant - Salary Components" ON public.salary_components
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Isolasi Tenant - Employee Salaries" ON public.employee_salaries
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Isolasi Tenant - Payroll Periods" ON public.payroll_periods
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Isolasi Tenant - Payroll Results" ON public.payroll_results
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Isolasi Tenant - Payroll Summary" ON public.payroll_summary
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- Employee bisa lihat hasil payroll sendiri
CREATE POLICY "Employee Lihat Payroll Sendiri" ON public.payroll_summary
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

CREATE POLICY "Employee Lihat Detail Payroll" ON public.payroll_results
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- Default components trigger
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

-- Tambah kolom ke payroll_settings
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS overtime_rate_weekday NUMERIC DEFAULT 1.5;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS overtime_rate_holiday NUMERIC DEFAULT 2.0;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS night_shift_rate NUMERIC DEFAULT 1.5;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS overtime_calculation VARCHAR(20) DEFAULT 'daily';
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS bpjs_kesehatan_max NUMERIC DEFAULT 12000000;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS bpjs_jht_max NUMERIC DEFAULT 106584000;
ALTER TABLE public.payroll_settings ADD COLUMN IF NOT EXISTS bpjs_jp_max NUMERIC DEFAULT 106584000;
