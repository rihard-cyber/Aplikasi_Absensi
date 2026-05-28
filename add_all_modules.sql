-- =============================================================
-- MIGRATION: All New Modules — Helpdesk, Patroli, Booking,
-- Visitor, Work Order, Fleet, Inventory, Incident,
-- Shift Swap, Hybrid Work, Missed Guard
-- =============================================================

-- ═════════════════════════════════════════════════════════════
-- 1. HELPDESK / TICKETING SYSTEM
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('listrik','ac','plumbing','it','kebersihan','umum')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution_notes TEXT,
  sla_deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 2. PATROLI / GUARD TOUR SYSTEM
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.patrol_checkpoints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  location_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patrol_routes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  checkpoint_order UUID[] DEFAULT '{}',
  estimated_duration_min INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patrol_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES public.patrol_routes(id) ON DELETE SET NULL,
  checkpoint_id UUID REFERENCES public.patrol_checkpoints(id) ON DELETE CASCADE NOT NULL,
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  status TEXT DEFAULT 'ontime' CHECK (status IN ('ontime','late','missed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patrol_incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patrol_log_id UUID REFERENCES public.patrol_logs(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('kebakaran','pencurian','kecelakaan','kerusakan','mencurigakan','lainnya')),
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patrol_shift_handovers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  handover_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 3. BOOKING RUANGAN & FASILITAS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('room','vehicle','equipment')),
  capacity INT,
  facilities JSONB DEFAULT '[]'::jsonb,
  location TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','checked_in','checked_out')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 4. VISITOR MANAGEMENT
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  host_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  identity_number TEXT,
  phone TEXT,
  vehicle_plate TEXT,
  purpose TEXT NOT NULL,
  visit_date DATE NOT NULL,
  qr_code TEXT UNIQUE,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  badge_printed BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 5. WORK ORDER MAINTENANCE
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES public.helpdesk_tickets(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_type TEXT NOT NULL CHECK (work_type IN ('preventive','corrective','inspection')),
  title TEXT NOT NULL,
  description TEXT,
  schedule_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  checklist JSONB DEFAULT '[]'::jsonb,
  photo_before_url TEXT,
  photo_after_url TEXT,
  material_used JSONB DEFAULT '[]'::jsonb,
  signed_by_technician BOOLEAN DEFAULT false,
  signature_technician_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 6. FLEET & TRANSPORT MANAGEMENT
-- ═════════════════════════════════════════════════════════════
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

-- ═════════════════════════════════════════════════════════════
-- 7. INVENTORY MANAGEMENT
-- ═════════════════════════════════════════════════════════════
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
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 8. INCIDENT & SAFETY REPORTING
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('kebakaran','kecelakaan_kerja','pencurian','k3','near_miss','lainnya')),
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  corrective_action TEXT,
  action_pic UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_deadline DATE,
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported','investigating','resolved','closed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 9. SHIFT SWAP
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  from_shift_id UUID REFERENCES public.master_shifts(id) ON DELETE CASCADE,
  to_shift_id UUID REFERENCES public.master_shifts(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- 10. HYBRID WORK (WFH/WFA/WFO)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.work_mode_policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  enable_wfh BOOLEAN DEFAULT false,
  enable_wfa BOOLEAN DEFAULT false,
  max_wfh_days_per_week INT DEFAULT 2,
  max_wfa_days_per_month INT DEFAULT 3,
  require_home_address BOOLEAN DEFAULT true,
  require_task_plan BOOLEAN DEFAULT false,
  verification_method TEXT DEFAULT 'gps_selfie',
  random_check_frequency INT DEFAULT 2,
  random_check_timeout_min INT DEFAULT 5,
  wfh_hours_flexible BOOLEAN DEFAULT true,
  wfh_core_start TIME DEFAULT '09:00',
  wfh_core_end TIME DEFAULT '15:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_home_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT DEFAULT 50,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_task_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  UNIQUE(profile_id, date)
);

CREATE TABLE IF NOT EXISTS public.verification_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  attendance_log_id UUID REFERENCES public.attendance_logs(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('WFA','WFH')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  selfie_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','missed','suspicious')),
  risk_score INT DEFAULT 0
);

-- ALTER existing tables for hybrid work
ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'WFO' CHECK (work_mode IN ('WFO','WFH','WFA'));
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'WFO';
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'gps';
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10,7);
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(10,7);
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS home_distance_meters NUMERIC;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS wfh_plan_submitted BOOLEAN DEFAULT false;

-- ═════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═════════════════════════════════════════════════════════════
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
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_mode_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_home_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_my_tenant() RETURNS UUID
  LANGUAGE SQL STABLE AS $$ SELECT tenant_id FROM profiles WHERE auth_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT
  LANGUAGE SQL STABLE AS $$ SELECT role FROM profiles WHERE auth_id = auth.uid() $$;

-- Tenant isolation policies
DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY['helpdesk_tickets','patrol_checkpoints','patrol_routes','patrol_logs','patrol_incidents','patrol_shift_handovers','facilities','booking_requests','visitors','work_orders','fleet_vehicles','fleet_trips','inventory_items','inventory_transactions','incident_reports','shift_swaps']
  LOOP
    EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON %I FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = ''SUPER_ADMIN'')', tbl, tbl);
    EXECUTE format('GRANT ALL ON %I TO authenticated', tbl);
  END LOOP;
END $$;

-- GRANT for hybrid tables
GRANT ALL ON public.work_mode_policies TO authenticated;
GRANT ALL ON public.employee_home_addresses TO authenticated;
GRANT ALL ON public.daily_task_plans TO authenticated;
GRANT ALL ON public.verification_checks TO authenticated;
