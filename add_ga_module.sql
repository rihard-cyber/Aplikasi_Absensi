-- Office/GA Module
CREATE TABLE IF NOT EXISTS public.ga_supplies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'atk' CHECK (category IN ('atk','cleaning','kitchen','furniture','electronic','other')),
  stock INT DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  min_stock INT DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ga_supply_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'atk' CHECK (category IN ('atk','cleaning','kitchen','furniture','electronic','other')),
  quantity INT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','urgent')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','fulfilled')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ga_maintenance_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('ac','listrik','plumbing','furniture','electronic','building','cleaning','other')),
  description TEXT NOT NULL,
  location TEXT,
  photo_url TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved','closed')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ga_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_maintenance_reports ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ga_supplies TO authenticated;
GRANT ALL ON public.ga_supply_requests TO authenticated;
GRANT ALL ON public.ga_maintenance_reports TO authenticated;

CREATE POLICY "tenant_isolation_ga_supplies" ON public.ga_supplies FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_ga_supply_requests" ON public.ga_supply_requests FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_ga_maintenance_reports" ON public.ga_maintenance_reports FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
