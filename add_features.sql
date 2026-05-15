-- ==============================================================================
-- FEATURES MODULE v1.0: Holidays, QR Attendance, Org Chart
-- Eksekusi di Supabase SQL Editor
-- ==============================================================================

-- [T] KALENDER LIBUR / HARI BESAR
CREATE TABLE public.company_holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) DEFAULT 'NATIONAL' CHECK (type IN ('NATIONAL', 'COMPANY', 'RELIGIOUS')),
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, date)
);

-- [U] QR ATTENDANCE TOKENS (untuk absen via scan)
CREATE TABLE public.qr_attendance_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [V] QR ATTENDANCE LOGS
CREATE TABLE public.qr_attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token_id UUID REFERENCES public.qr_attendance_tokens(id) ON DELETE SET NULL,
  action VARCHAR(20) DEFAULT 'CLOCK_IN',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_attendance_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolasi Tenant - Holidays" ON public.company_holidays
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - QR Tokens" ON public.qr_attendance_tokens
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - QR Logs" ON public.qr_attendance_logs
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Employee Read Holidays" ON public.company_holidays FOR SELECT USING (true);
CREATE POLICY "Employee Insert QR Logs" ON public.qr_attendance_logs FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Read QR Logs" ON public.qr_attendance_logs FOR SELECT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Read QR Tokens" ON public.qr_attendance_tokens FOR SELECT
  WITH CHECK (tenant_id = public.get_my_tenant());
