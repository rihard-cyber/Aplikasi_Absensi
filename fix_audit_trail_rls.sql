-- ==============================================================================
-- HOTFIX: Tambah RLS Policy agar Tenant Admin bisa lihat Audit Log sendiri
-- ==============================================================================
-- Sebelumnya: Hanya SUPER_ADMIN yang bisa SELECT audit_logs
-- Sesudah: Tenant Admin & Sub Admin bisa lihat log tenant mereka sendiri
-- ==============================================================================

DROP POLICY IF EXISTS "Admin Lihat Logs Tenant" ON public.audit_logs;
CREATE POLICY "Admin Lihat Logs Tenant" ON public.audit_logs
  FOR SELECT USING (
    tenant_id = public.get_my_tenant() 
    AND public.get_my_role() IN ('TENANT_ADMIN', 'SUB_ADMIN')
  );
