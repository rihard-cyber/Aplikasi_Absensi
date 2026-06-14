-- Legal Module
CREATE TABLE IF NOT EXISTS public.legal_contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('employment','vendor','client','nda','lease','service','partnership','other')),
  party_name TEXT,
  start_date DATE,
  end_date DATE,
  value DECIMAL(15,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','expiring','expired','terminated')),
  document_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('litigation','arbitration','mediation','labor','contract_dispute','regulatory','other')),
  case_number TEXT,
  party_opposing TEXT,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_hearing DATE,
  document_url TEXT,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.legal_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.legal_contracts TO authenticated;
GRANT ALL ON public.legal_cases TO authenticated;

CREATE POLICY "tenant_isolation_legal_contracts" ON public.legal_contracts FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "tenant_isolation_legal_cases" ON public.legal_cases FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');
