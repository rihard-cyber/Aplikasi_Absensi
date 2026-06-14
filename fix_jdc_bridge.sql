-- Bridge & Repair Script for JDC Integration
-- This script ensures the JDC module is connected to the main Profile system
-- and fixes missing tables.

-- 1. Ensure JDC 'users' table exists (compatible with JDC code)
CREATE TABLE IF NOT EXISTS public.users (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE, -- JDC internal ID
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  nrp TEXT UNIQUE,
  nama TEXT,
  jabatan TEXT,
  regu TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'Aktif',
  email TEXT,
  nomor_hp TEXT,
  last_active TIMESTAMPTZ,
  firebase_saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add RLS to 'users'
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_users" ON public.users;
CREATE POLICY "tenant_isolation_users" ON public.users 
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'SUPER_ADMIN'));

-- 3. Trigger Function to sync Profiles to Security Positions & JDC Users
CREATE OR REPLACE FUNCTION public.sync_profile_to_security_modules()
RETURNS TRIGGER AS $$
DECLARE
    v_division_name TEXT;
    v_is_security BOOLEAN;
BEGIN
    -- Get division name
    SELECT name INTO v_division_name FROM public.divisions WHERE id = NEW.division_id;
    
    -- Check if it's security division (simple check)
    v_is_security := (v_division_name ILIKE '%security%' OR v_division_name ILIKE '%satpam%' OR v_division_name ILIKE '%pengamanan%');

    IF v_is_security THEN
        -- Sync to security_positions
        INSERT INTO public.security_positions (tenant_id, profile_id, jabatan, regu, is_active)
        VALUES (NEW.tenant_id, NEW.id, COALESCE(NEW.role, 'Anggota'), '', true)
        ON CONFLICT (tenant_id, profile_id) DO UPDATE SET
            jabatan = EXCLUDED.jabatan,
            updated_at = NOW();

        -- Sync to JDC users table
        INSERT INTO public.users (id, tenant_id, nrp, nama, jabatan, email, nomor_hp, status)
        VALUES (NEW.id::text, NEW.tenant_id, NEW.nip, NEW.full_name, NEW.role, NEW.email, NEW.phone, 'Aktif')
        ON CONFLICT (nrp) DO UPDATE SET
            nama = EXCLUDED.nama,
            jabatan = EXCLUDED.jabatan,
            email = EXCLUDED.email,
            nomor_hp = EXCLUDED.nomor_hp,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
DROP TRIGGER IF EXISTS tr_sync_profile_to_security ON public.profiles;
CREATE TRIGGER tr_sync_profile_to_security
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_security_modules();

-- 5. Backfill existing security profiles
DO $$
BEGIN
    INSERT INTO public.users (id, tenant_id, nrp, nama, jabatan, email, nomor_hp, status)
    SELECT p.id::text, p.tenant_id, p.nip, p.full_name, p.role, p.email, p.phone, 'Aktif'
    FROM public.profiles p
    JOIN public.divisions d ON p.division_id = d.id
    WHERE d.name ILIKE '%security%' OR d.name ILIKE '%satpam%' OR d.name ILIKE '%pengamanan%'
    ON CONFLICT (nrp) DO NOTHING;
END $$;
