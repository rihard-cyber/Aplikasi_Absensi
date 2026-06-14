-- Duty Assignment & Tasking Migration
-- Purpose: Store daily personnel plotting to guard posts

CREATE TABLE IF NOT EXISTS public.guard_post_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pos_id UUID REFERENCES public.pos_list(supabase_id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift VARCHAR(50),
  regu VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ON_DUTY, COMPLETED
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, shift)
);

-- RLS for Guard Post Assignments
ALTER TABLE public.guard_post_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_duty" ON public.guard_post_assignments;
CREATE POLICY "tenant_isolation_duty" ON public.guard_post_assignments 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

GRANT ALL ON public.guard_post_assignments TO authenticated;

-- Add notification type record if needed (logic handled in app)
-- Refresh schema
NOTIFY pgrst, 'reload schema';
