-- ==============================================================================
-- HR FEATURES: Performance Appraisal, Onboarding
-- ==============================================================================

-- [W] PERFORMANCE APPRAISAL / KPI REVIEW
CREATE TABLE public.performance_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  period_label VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kpi_score NUMERIC(5,2),        -- 0-100
  behavioral_score NUMERIC(5,2), -- 0-100
  final_score NUMERIC(5,2),      -- weighted average
  achievements TEXT,
  improvements TEXT,
  reviewer_notes TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [X] ONBOARDING / OFFBOARDING CHECKLIST
CREATE TABLE public.onboarding_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'ONBOARDING' CHECK (category IN ('ONBOARDING', 'OFFBOARDING')),
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolasi Tenant - Reviews" ON public.performance_reviews
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Onboarding" ON public.onboarding_tasks
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Employee Lihat Review Sendiri" ON public.performance_reviews
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Lihat Onboarding Sendiri" ON public.onboarding_tasks
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- Default onboarding tasks trigger
CREATE OR REPLACE FUNCTION public.handle_onboarding_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('EMPLOYEE', 'SUB_ADMIN') AND NEW.auth_id IS NOT NULL THEN
    INSERT INTO public.onboarding_tasks (tenant_id, user_id, task_name, category) VALUES
      (NEW.tenant_id, NEW.id, 'Lengkapi Data Pribadi (KTP, KK)', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Upload Foto Profil', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Lengkapi Data BPJS & NPWP', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Upload Dokumen Kontrak', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Pengikatan Perangkat (Device Binding)', 'ONBOARDING'),
      (NEW.tenant_id, NEW.id, 'Orientasi & Pengenalan Tim', 'ONBOARDING');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_onboarding_tasks();
