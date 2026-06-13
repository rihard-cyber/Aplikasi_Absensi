-- ==============================================================================
-- MIGRATION: Tenant Feature Flags & Guard Mutations (Buku Mutasi)
-- ==============================================================================

-- 1. Table for Tenant Module Flags (Feature Toggles)
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  module_key TEXT NOT NULL, -- e.g., 'helpdesk', 'patrol', 'booking', 'visitor', 'work_order', 'fleet', 'inventory', 'incident', 'shift_swap', 'hybrid_work', 'payroll'
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_key)
);

-- 2. Table for Guard Mutation Logs (Buku Mutasi Penjagaan)
CREATE TABLE IF NOT EXISTS public.mutasi_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT,
  regu TEXT,
  waktu TIME NOT NULL DEFAULT CURRENT_TIME,
  tanggal_kejadian DATE NOT NULL DEFAULT CURRENT_DATE,
  jam_kejadian TIME NOT NULL DEFAULT CURRENT_TIME,
  lokasi TEXT NOT NULL,
  uraian TEXT NOT NULL,
  kategori TEXT NOT NULL, -- Informasi, Kehilangan, Kerusakan, Gangguan, Emergency, Lainnya
  foto TEXT,
  anti_fraud JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutasi_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create Isolation Policies (Tenant Isolation & Super Admin Override)
DROP POLICY IF EXISTS "tenant_isolation_tenant_modules" ON public.tenant_modules;
CREATE POLICY "tenant_isolation_tenant_modules" ON public.tenant_modules
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_mutasi_logs" ON public.mutasi_logs;
CREATE POLICY "tenant_isolation_mutasi_logs" ON public.mutasi_logs
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- 5. Grant Permissions to Authenticated Users
GRANT ALL ON public.tenant_modules TO authenticated;
GRANT ALL ON public.mutasi_logs TO authenticated;
