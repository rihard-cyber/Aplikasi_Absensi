-- ==============================================================================
-- ENTERPRISE PLUS: Events, Enhanced Settings
-- ==============================================================================

-- [AB] ACARA & KEGIATAN PERUSAHAAN
CREATE TABLE public.company_events (
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

ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolasi Tenant - Events" ON public.company_events
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Employee Read Events" ON public.company_events
  FOR SELECT USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- Tambah kolom ke tenant_settings untuk konfigurasi lanjutan
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS overtime_rate_weekday NUMERIC DEFAULT 1.5;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS overtime_rate_holiday NUMERIC DEFAULT 2.0;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS bpjs_kesehatan_company NUMERIC DEFAULT 4;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan_company NUMERIC DEFAULT 3.7;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS pph21_method VARCHAR(20) DEFAULT 'TER' CHECK (pph21_method IN ('TER', 'GROSS_UP', 'NETTO'));
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS payday_date INT DEFAULT 25 CHECK (payday_date BETWEEN 1 AND 31);
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS use_attendance_deduction BOOLEAN DEFAULT false;
