-- Cleaning Service Module
-- Tabel area/task definitions
CREATE TABLE IF NOT EXISTS public.cleaning_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  floor TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cleaning_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  area_id UUID REFERENCES public.cleaning_areas(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly','shift')),
  shift TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cleaning_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.cleaning_tasks(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.cleaning_areas(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  notes TEXT,
  photo_before TEXT,
  photo_after TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cleaning_checklist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  area_id UUID REFERENCES public.cleaning_areas(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cleaning_checklist_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  log_id UUID REFERENCES public.cleaning_logs(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES public.cleaning_checklist(id) ON DELETE CASCADE,
  is_checked BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cleaning_supplies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('chemical','tool','consumable','other')),
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,
  unit TEXT DEFAULT 'pcs',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cleaning_supply_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  supply_id UUID REFERENCES public.cleaning_supplies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in','out')),
  qty INT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cleaning_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_checklist_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_supply_transactions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.cleaning_areas TO authenticated;
GRANT ALL ON public.cleaning_tasks TO authenticated;
GRANT ALL ON public.cleaning_logs TO authenticated;
GRANT ALL ON public.cleaning_checklist TO authenticated;
GRANT ALL ON public.cleaning_checklist_results TO authenticated;
GRANT ALL ON public.cleaning_supplies TO authenticated;
GRANT ALL ON public.cleaning_supply_transactions TO authenticated;

CREATE POLICY "tenant_isolation_cleaning_areas" ON public.cleaning_areas
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_cleaning_tasks" ON public.cleaning_tasks
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_cleaning_logs" ON public.cleaning_logs
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_cleaning_checklist" ON public.cleaning_checklist
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_cleaning_checklist_results" ON public.cleaning_checklist_results
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_cleaning_supplies" ON public.cleaning_supplies
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_cleaning_supply_transactions" ON public.cleaning_supply_transactions
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
