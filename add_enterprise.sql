-- ==============================================================================
-- ENTERPRISE MODULE: Assets, Schedule Calendar support
-- ==============================================================================

-- [Y] ASET PERUSAHAAN
CREATE TABLE public.company_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  asset_code VARCHAR(50) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('LAPTOP', 'PHONE', 'UNIFORM', 'VEHICLE', 'TOOL', 'OTHER')),
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_price NUMERIC(15,2),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, asset_code)
);

ALTER TABLE public.company_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolasi Tenant - Assets" ON public.company_assets
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Employee Lihat Asset Sendiri" ON public.company_assets
  FOR SELECT USING (assigned_to IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
