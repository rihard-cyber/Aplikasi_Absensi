-- ==============================================================================
-- HR PLUS: Salary Revisions, Profile Updates
-- ==============================================================================

-- [AA] RIWAYAT PERUBAHAN GAJI
CREATE TABLE public.salary_revisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  previous_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  new_amount NUMERIC(15,2) NOT NULL,
  change_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  change_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.salary_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolasi Tenant - Salary Revisions" ON public.salary_revisions
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Employee Lihat Revisions Sendiri" ON public.salary_revisions
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
