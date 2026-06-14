-- IT Module
CREATE TABLE IF NOT EXISTS public.it_software_licenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  software_name TEXT NOT NULL,
  vendor TEXT,
  license_key TEXT,
  seats INT DEFAULT 1,
  used_seats INT DEFAULT 0,
  purchase_date DATE,
  expiry_date DATE,
  cost DECIMAL(15,2),
  renewal_type TEXT DEFAULT 'annual' CHECK (renewal_type IN ('monthly','annual','perpetual','lifetime')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expiring','expired','cancelled')),
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.it_equipment_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('laptop','monitor','keyboard','mouse','headset','phone','tablet','printer','accessory','other')),
  specification TEXT,
  quantity INT DEFAULT 1,
  reason TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','fulfilled')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.it_software_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_equipment_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.it_software_licenses TO authenticated;
GRANT ALL ON public.it_equipment_requests TO authenticated;

CREATE POLICY "tenant_isolation_it_licenses" ON public.it_software_licenses FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_it_equipment_req" ON public.it_equipment_requests FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
