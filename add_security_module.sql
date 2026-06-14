-- Modul Keamanan JDC — migrasi additive (tidak mengubah tabel absensi existing)
-- Jalankan di SQL Editor Supabase. Aman di-run ulang (IF NOT EXISTS).

-- Posisi security per karyawan (Danru, Wadanru, regu, dll.)
CREATE TABLE IF NOT EXISTS public.security_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jabatan TEXT NOT NULL DEFAULT 'Anggota',
  regu TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE (tenant_id, profile_id)
);

-- Absensi plotting regu (AbsensiRegu JDC)
CREATE TABLE IF NOT EXISTS public.security_regu_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  shift TEXT,
  regu TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Konfigurasi modul keamanan per tenant
CREATE TABLE IF NOT EXISTS public.tenant_security_config (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  wa_contacts JSONB DEFAULT '{}'::jsonb,
  complaint_public_url TEXT,
  require_pin BOOLEAN NOT NULL DEFAULT false,
  shift_codes JSONB DEFAULT '{"P":"Pagi","S":"Siang","M":"Malam","X":"Libur"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_positions_tenant ON public.security_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_positions_profile ON public.security_positions(profile_id);
CREATE INDEX IF NOT EXISTS idx_security_regu_attendance_tenant_date ON public.security_regu_attendance(tenant_id, tanggal);

ALTER TABLE public.security_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_regu_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_security_config ENABLE ROW LEVEL SECURITY;

-- RLS: tenant-scoped read/write for admins & security staff in same tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'security_positions' AND policyname = 'security_positions_tenant_access'
  ) THEN
    CREATE POLICY security_positions_tenant_access ON public.security_positions
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'security_regu_attendance' AND policyname = 'security_regu_attendance_tenant_access'
  ) THEN
    CREATE POLICY security_regu_attendance_tenant_access ON public.security_regu_attendance
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tenant_security_config' AND policyname = 'tenant_security_config_tenant_access'
  ) THEN
    CREATE POLICY tenant_security_config_tenant_access ON public.tenant_security_config
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN')
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
