-- Engineering/Teknisi Module
CREATE TABLE IF NOT EXISTS public.equipment_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('ac','electrical','plumbing','mechanical','fire','security','other')),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  floor TEXT,
  install_date DATE,
  warranty_expiry DATE,
  last_service DATE,
  service_interval_days INT DEFAULT 90,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pm_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.equipment_list(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  estimated_duration_min INT DEFAULT 30,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pm_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES public.pm_schedules(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_list(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  findings TEXT,
  checklist_results JSONB DEFAULT '[]'::jsonb,
  photo_before TEXT,
  photo_after TEXT,
  completed_at TIMESTAMPTZ,
  next_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sparepart_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  part_name TEXT NOT NULL,
  part_number TEXT,
  equipment_id UUID REFERENCES public.equipment_list(id) ON DELETE SET NULL,
  qty INT DEFAULT 1,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','emergency')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','ordered','received')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.equipment_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparepart_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.equipment_list TO authenticated;
GRANT ALL ON public.pm_schedules TO authenticated;
GRANT ALL ON public.pm_logs TO authenticated;
GRANT ALL ON public.sparepart_requests TO authenticated;

CREATE POLICY "tenant_isolation_equipment" ON public.equipment_list FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_pm_schedules" ON public.pm_schedules FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_pm_logs" ON public.pm_logs FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_sparepart_requests" ON public.sparepart_requests FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
