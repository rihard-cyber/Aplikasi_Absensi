-- Driver/Sopir Module
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.fleet_trips(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  liter DECIMAL(10,2) NOT NULL,
  amount DECIMAL(15,2),
  price_per_liter DECIMAL(10,2),
  fuel_type TEXT DEFAULT 'solar' CHECK (fuel_type IN ('solar','premium','pertalite','pertamax','pertamax_turbo','listrik','other')),
  odometer INT,
  station TEXT,
  receipt_photo TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_claims (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.fleet_trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('toll','parking','meal','other')),
  amount DECIMAL(15,2) NOT NULL,
  receipt_photo TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_claims ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.fuel_logs TO authenticated;
GRANT ALL ON public.trip_claims TO authenticated;

CREATE POLICY "tenant_isolation_fuel_logs" ON public.fuel_logs FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_trip_claims" ON public.trip_claims FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
