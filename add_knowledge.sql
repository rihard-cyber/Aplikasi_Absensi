-- ==============================================================================
-- KNOWLEDGE BASE: Company Policies & Documents
-- ==============================================================================

-- [Z] KEBIJAKAN & DOKUMEN PERUSAHAAN
CREATE TABLE public.company_policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('HR', 'FINANCE', 'OPERATIONAL', 'IT', 'SAFETY', 'GENERAL')),
  content TEXT,
  file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  version VARCHAR(20) DEFAULT '1.0',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolasi Tenant - Policies" ON public.company_policies
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Employee Read Policies" ON public.company_policies
  FOR SELECT USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

INSERT INTO storage.buckets (id, name, public) VALUES ('policies', 'policies', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Read Policies" ON storage.objects FOR SELECT USING (bucket_id = 'policies');
CREATE POLICY "Auth Upload Policies" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'policies' AND auth.role() = 'authenticated');
