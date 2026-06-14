-- ==============================================================================
-- MIGRATION: Tenant Role-Based Feature Permissions
-- ==============================================================================

-- 1. Create table for granular role permissions within a tenant
CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role_name VARCHAR(50) NOT NULL, -- 'DIREKTUR', 'HRD', 'MANAJEMEN', 'KARYAWAN', 'ADMIN'
  allowed_modules TEXT[] DEFAULT '{}'::TEXT[], -- list of allowed action/feature IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, role_name)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Create Isolation Policies (Tenant isolation & Super Admin bypass)
DROP POLICY IF EXISTS "tenant_isolation_tenant_role_permissions" ON public.tenant_role_permissions;
CREATE POLICY "tenant_isolation_tenant_role_permissions" ON public.tenant_role_permissions
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- 4. Grant Permissions to Authenticated Users
GRANT ALL ON public.tenant_role_permissions TO authenticated;
