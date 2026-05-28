-- =============================================================
-- MIGRATION: Overtime, Timesheet & Flexible Payroll Period
-- 1. Overtime requests & forms
-- 2. Fix payroll_periods untuk custom date range
-- 3. Timesheet support (rekap view dari attendance_logs)
-- =============================================================

-- 1. OVERTIME REQUESTS
CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  shift_id UUID REFERENCES public.master_shifts(id) ON DELETE SET NULL,
  overtime_type TEXT NOT NULL DEFAULT 'voluntary' CHECK (overtime_type IN ('voluntary','forced','emergency','holiday')),
  is_forced BOOLEAN DEFAULT false,
  forced_reason TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','billed')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OVERTIME PDF FORMS
CREATE TABLE IF NOT EXISTS public.overtime_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  overtime_request_id UUID REFERENCES public.overtime_requests(id) ON DELETE CASCADE NOT NULL,
  form_number TEXT NOT NULL,
  pdf_url TEXT,
  signed_by_employee BOOLEAN DEFAULT false,
  signed_by_supervisor BOOLEAN DEFAULT false,
  signed_by_client BOOLEAN DEFAULT false,
  signature_employee_url TEXT,
  signature_supervisor_url TEXT,
  signature_client_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FIX PAYROLL_PERIODS untuk custom date range
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('monthly','custom'));
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS label TEXT;

DO $$
BEGIN
  ALTER TABLE public.payroll_periods DROP CONSTRAINT IF EXISTS payroll_periods_tenant_id_period_month_period_year_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 4. RLS POLICIES
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_forms ENABLE ROW LEVEL SECURITY;

CREATE policy "overtime_requests_tenant_isolation" ON public.overtime_requests
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

CREATE policy "overtime_forms_tenant_isolation" ON public.overtime_forms
  FOR ALL USING (overtime_request_id IN (
    SELECT id FROM public.overtime_requests WHERE tenant_id = get_my_tenant()
  ) OR get_my_role() = 'SUPER_ADMIN');

GRANT ALL ON public.overtime_requests TO authenticated;
GRANT ALL ON public.overtime_forms TO authenticated;
