-- ============================================================
-- SI PRESENSI PRO MAX — MASTER MIGRATION
-- Jalankan di Supabase SQL Editor. Urut! (WAJIB)
-- ============================================================
-- Cara pakai:
--   1. Buka https://supabase.com/dashboard/project/{your-project}/sql/new
--   2. Copy-paste seluruh file ini
--   3. RUN (pastikan tidak ada error merah)
-- ============================================================

-- ═════════════════════════════════════════════════════════════
-- FASE 1: Auth & Phone Feature
-- ═════════════════════════════════════════════════════════════
-- Sumber: add_auth_phone_feature.sql
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone TEXT)
RETURNS TABLE(email TEXT) LANGUAGE SQL STABLE AS $$
  SELECT email FROM auth.users WHERE id IN (SELECT auth_id FROM profiles WHERE phone = p_phone)
$$;
COMMIT;

-- ═════════════════════════════════════════════════════════════
-- FASE 2: Overtime & Timesheet & Payroll Periods
-- ═════════════════════════════════════════════════════════════
-- Sumber: add_overtime_timesheet.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  overtime_type TEXT NOT NULL CHECK (overtime_type IN ('sukarela','paksa','darurat','libur')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours NUMERIC DEFAULT 0,
  description TEXT,
  is_forced BOOLEAN DEFAULT false,
  forced_reason TEXT,
  replaced_profile_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','billed')),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.overtime_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES public.overtime_requests(id) ON DELETE CASCADE UNIQUE NOT NULL,
  form_number TEXT,
  signature_employee_url TEXT,
  signature_supervisor_url TEXT,
  signature_manager_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('monthly','custom'));
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.payroll_periods DROP CONSTRAINT IF EXISTS payroll_periods_tenant_id_period_month_period_year_key;

ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overtime_requests_tenant_isolation" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_forms_tenant_isolation" ON public.overtime_forms;
CREATE POLICY "overtime_requests_tenant_isolation" ON public.overtime_requests FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "overtime_forms_tenant_isolation" ON public.overtime_forms FOR ALL USING (request_id IN (SELECT id FROM public.overtime_requests WHERE tenant_id = get_my_tenant()));
GRANT ALL ON public.overtime_requests TO authenticated;
GRANT ALL ON public.overtime_forms TO authenticated;

COMMIT;

-- ═════════════════════════════════════════════════════════════
-- FASE 3: All Modules (19 tables + RLS)
-- ═════════════════════════════════════════════════════════════
-- Sumber: add_all_modules.sql
BEGIN;

-- Helper functions (dibutuhkan untuk RLS) — SECURITY DEFINER wajib agar tidak infinite recursion
CREATE OR REPLACE FUNCTION public.get_my_tenant()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM profiles WHERE auth_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE auth_id = auth.uid()
$$;

-- 1. HELPDESK
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ticket_number TEXT,
  submitter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  category TEXT NOT NULL CHECK (category IN ('listrik','ac','plumbing','it','kebersihan','umum')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  subject TEXT NOT NULL,
  description TEXT,
  photo_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATROL
CREATE TABLE IF NOT EXISTS public.patrol_checkpoints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  qr_code TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  radius_meters INT DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.patrol_routes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.patrol_route_checkpoints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES public.patrol_routes(id) ON DELETE CASCADE NOT NULL,
  checkpoint_id UUID REFERENCES public.patrol_checkpoints(id) ON DELETE CASCADE NOT NULL,
  order_index INT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.patrol_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  checkpoint_id UUID REFERENCES public.patrol_checkpoints(id),
  route_id UUID REFERENCES public.patrol_routes(id),
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  photo_url TEXT,
  status TEXT DEFAULT 'on_time' CHECK (status IN ('on_time','late','missed'))
);
CREATE TABLE IF NOT EXISTS public.patrol_incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  patrol_log_id UUID REFERENCES public.patrol_logs(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  photo_url TEXT,
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported','investigating','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.patrol_shift_handovers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_profile_id UUID REFERENCES public.profiles(id) NOT NULL,
  to_profile_id UUID REFERENCES public.profiles(id) NOT NULL,
  handover_time TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  incident_summary TEXT
);

-- 3. BOOKING
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('room','vehicle','equipment')),
  capacity INT DEFAULT 1,
  location TEXT,
  description TEXT,
  facilities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','checked_in','checked_out')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VISITOR
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  host_id UUID REFERENCES public.profiles(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  purpose TEXT,
  qr_code TEXT,
  is_checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  is_checked_out BOOLEAN DEFAULT false,
  checked_out_at TIMESTAMPTZ,
  badge_printed BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORK ORDER
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES public.helpdesk_tickets(id),
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT DEFAULT 'maintenance' CHECK (work_type IN ('maintenance','repair','installation','inspection')),
  assigned_to UUID REFERENCES public.profiles(id),
  scheduled_date DATE,
  completed_date DATE,
  checklist JSONB DEFAULT '[]',
  materials_used JSONB DEFAULT '[]',
  photo_before TEXT,
  photo_after TEXT,
  technician_signature TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FLEET
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plate_number TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INT,
  color TEXT,
  fuel_type TEXT DEFAULT 'bensin' CHECK (fuel_type IN ('bensin','solar','electric')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','retired')),
  stnk_expiry DATE,
  insurance_expiry DATE,
  last_service_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.fleet_trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  departure_km INT,
  return_km INT,
  destination TEXT NOT NULL,
  purpose TEXT,
  fuel_liters DECIMAL(8,2),
  fuel_cost DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  quantity INT DEFAULT 0,
  min_stock INT DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  location TEXT,
  barcode TEXT,
  price DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in','out')),
  quantity INT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INCIDENT / K3
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('kebakaran','kecelakaan','bencana','keamanan','kesehatan','lainnya')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT NOT NULL,
  location TEXT,
  photos JSONB DEFAULT '[]',
  corrective_action TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported','investigating','resolved','closed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8b. MASTER SHIFTS (dibutuhkan oleh shift_swaps)
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SHIFT SWAP
CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_employee UUID REFERENCES public.profiles(id) NOT NULL,
  to_employee UUID REFERENCES public.profiles(id) NOT NULL,
  schedule_date DATE NOT NULL,
  from_shift_id UUID REFERENCES public.master_shifts(id) ON DELETE CASCADE,
  to_shift_id UUID REFERENCES public.master_shifts(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. HYBRID WORK
CREATE TABLE IF NOT EXISTS public.work_mode_policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  enable_wfh BOOLEAN DEFAULT false,
  enable_wfa BOOLEAN DEFAULT false,
  max_wfh_days_per_week INT DEFAULT 2,
  require_home_address BOOLEAN DEFAULT true,
  require_task_plan BOOLEAN DEFAULT true,
  core_start_time TIME DEFAULT '09:00',
  core_end_time TIME DEFAULT '17:00',
  flexible_hours BOOLEAN DEFAULT false,
  random_check_enabled BOOLEAN DEFAULT false,
  wfa_timeout_hours INT DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.employee_home_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  radius_meters INT DEFAULT 50,
  is_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.daily_task_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  tasks JSONB DEFAULT '[]',
  is_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.verification_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mode TEXT CHECK (mode IN ('wfh_plan','wfa_selfie','random_check')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','passed','failed')),
  photo_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALTER existing tables
ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'WFO' CHECK (work_mode IN ('WFO','WFH','WFA'));
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'WFO';
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'gps';
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10,7);
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(10,7);
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS home_distance_meters NUMERIC;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS wfh_plan_submitted BOOLEAN DEFAULT false;

-- RLS: Enable row level security on all new tables
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_route_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_mode_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_home_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;

-- RLS: Tenant isolation policies for ALL new tables
DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'helpdesk_tickets','patrol_checkpoints','patrol_routes','patrol_logs',
    'patrol_incidents','patrol_shift_handovers','facilities','booking_requests',
    'visitors','work_orders','fleet_vehicles','fleet_trips','inventory_items',
    'inventory_transactions','incident_reports','shift_swaps',
    'work_mode_policies','verification_checks'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_%s" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON %I FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = ''SUPER_ADMIN'')', tbl, tbl);
    EXECUTE format('GRANT ALL ON %I TO authenticated', tbl);
  END LOOP;
END $$;

-- RLS: master_shifts — tenant isolation
DROP POLICY IF EXISTS "tenant_isolation_master_shifts" ON public.master_shifts;
CREATE POLICY "tenant_isolation_master_shifts" ON public.master_shifts FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN'
);
GRANT ALL ON public.master_shifts TO authenticated;

-- RLS: patrol_route_checkpoints — via route_id → patrol_routes
ALTER TABLE public.patrol_route_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_patrol_route_checkpoints" ON public.patrol_route_checkpoints;
CREATE POLICY "tenant_isolation_patrol_route_checkpoints" ON public.patrol_route_checkpoints FOR ALL USING (
  route_id IN (SELECT id FROM public.patrol_routes WHERE tenant_id = get_my_tenant())
  OR get_my_role() = 'SUPER_ADMIN'
);
GRANT ALL ON public.patrol_route_checkpoints TO authenticated;

-- RLS: employee_home_addresses, daily_task_plans — user isolation (bukan tenant isolation)
DROP POLICY IF EXISTS "tenant_isolation_employee_home_addresses" ON public.employee_home_addresses;
CREATE POLICY "user_own_address" ON public.employee_home_addresses FOR ALL USING (
  user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
  OR get_my_role() = 'TENANT_ADMIN'
  OR get_my_role() = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "tenant_isolation_daily_task_plans" ON public.daily_task_plans;
CREATE POLICY "user_own_tasks" ON public.daily_task_plans FOR ALL USING (
  user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
  OR get_my_role() = 'TENANT_ADMIN'
  OR get_my_role() = 'SUPER_ADMIN'
);

COMMIT;

-- ═════════════════════════════════════════════════════════════
-- FASE 4: Notifications Table
-- ═════════════════════════════════════════════════════════════
-- Sumber: supabase/migrations/add_notifications.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);
GRANT ALL ON public.notifications TO authenticated;

COMMIT;

-- ═════════════════════════════════════════════════════════════
-- FASE 5: Storage Bucket untuk Dokumen
-- ═════════════════════════════════════════════════════════════
BEGIN;

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload to documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can read documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

COMMIT;

-- ═════════════════════════════════════════════════════════════
-- ✅ SELESAI. Semua tabel + RLS + Storage siap.
-- ═════════════════════════════════════════════════════════════
