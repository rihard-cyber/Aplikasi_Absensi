-- Tenant Complaints System (ala JDC Komplain Masuk)
CREATE TABLE IF NOT EXISTS public.tenant_complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  complainant_name TEXT NOT NULL,
  complainant_phone TEXT,
  complainant_company TEXT,
  location TEXT,
  category TEXT NOT NULL CHECK (category IN ('listrik','ac','plumbing','kebersihan','keamanan','kebisingan','fasilitas','umum','lainnya')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','emergency')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'baru' CHECK (status IN ('baru','diproses','selesai','ditutup')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  disposition_notes TEXT,
  resolved_at TIMESTAMPTZ,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  source TEXT DEFAULT 'web' CHECK (source IN ('web','qr','wa','manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenant_complaints ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tenant_complaints TO authenticated;
CREATE POLICY "tenant_isolation_tenant_complaints" ON public.tenant_complaints
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

-- Auto ticket number generator
CREATE OR REPLACE FUNCTION public.generate_complaint_ticket(tenant_slug TEXT)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT upper(tenant_slug) || '-CMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE(
    (SELECT COUNT(*)::INT + 1 FROM public.tenant_complaints WHERE created_at::DATE = CURRENT_DATE), 1
  )::TEXT, 3, '0');
$$;
