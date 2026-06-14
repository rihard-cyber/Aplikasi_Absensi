-- final_enterprise_sync_smpjdc.sql
-- Consolidated Final Migration for Enterprise Readiness
-- Target Tenant: SMPJDC (d9b1c7d2-0e9a-4830-a349-d57c0ee46616)

-- 1. BASE SCHEMA REPAIR (Idempotent)
CREATE TABLE IF NOT EXISTS public.pos_list (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  lantai TEXT, titik TEXT, keterangan TEXT, kode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.areas (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  gedung TEXT, lantai TEXT, nomor_titik TEXT, zona TEXT, titik TEXT, qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  nrp TEXT UNIQUE, nama TEXT, jabatan TEXT, regu TEXT, avatar TEXT, status TEXT DEFAULT 'Aktif',
  email TEXT, nomor_hp TEXT, last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guard_post_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pos_id UUID REFERENCES public.pos_list(supabase_id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift VARCHAR(50), regu VARCHAR(50), notes TEXT, status VARCHAR(50) DEFAULT 'PENDING',
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, shift)
);

-- 2. ENTERPRISE ENHANCEMENTS
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.company_assets ADD COLUMN IF NOT EXISTS last_condition_report TEXT;
ALTER TABLE public.payroll_results ADD COLUMN IF NOT EXISTS performance_bonus NUMERIC DEFAULT 0;

-- 3. MASTER DATA SEEDING (FOR SMPJDC)
DO $$
DECLARE
    v_tenant_id UUID := 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616';
BEGIN
    -- Seed Pos List
    INSERT INTO public.pos_list (id, tenant_id, lantai, titik, keterangan, kode)
    VALUES 
      ('pos-jdc', v_tenant_id, 'Pos JDC', 'Pos JDC', 'Pos jaga utama JDC', 'PJDC'),
      ('pos-00-area', v_tenant_id, 'Basement', 'Pos 00 Area', 'Pos area basement', 'P00A'),
      ('pos-01-lobby', v_tenant_id, '1', 'Pos 01 Lobby', 'Pos lobby utama lantai 1', 'P01'),
      ('pos-23-area', v_tenant_id, '2 & 3', 'Pos 2/3 area', 'Pos jaga lantai 2 dan 3', 'P23'),
      ('pos-45-area', v_tenant_id, '4 & 5', 'Pos 4/5 Area', 'Pos jaga lantai 4 dan 5', 'P45'),
      ('pos-67-area', v_tenant_id, '6 & 7', 'Pos 6/7 Area', 'Pos jaga lantai 6 dan 7', 'P67'),
      ('pos-pk-mobil', v_tenant_id, 'Parkir', 'Pos PK mobil', 'Pos parkir mobil', 'PKM'),
      ('pos-pk-motor', v_tenant_id, 'Parkir', 'Pos PK motor', 'Pos parkir motor', 'PKMR')
    ON CONFLICT (id) DO UPDATE SET titik = EXCLUDED.titik, kode = EXCLUDED.kode;

    -- Seed Patrol Areas
    INSERT INTO public.areas (id, tenant_id, gedung, lantai, nomor_titik, zona, titik, qr_code)
    VALUES 
      ('bsmt-b-1', v_tenant_id, 'SMPJDC - Jakarta Design Center', 'Basement', '1', 'B', 'Depan R. Elektrik', 'JDC-BSMT-B-1'),
      ('bsmt-a-2', v_tenant_id, 'SMPJDC - Jakarta Design Center', 'Basement', '2', 'A', 'R. Ganti Pakaian Security', 'JDC-BSMT-A-2'),
      ('l1-a-3', v_tenant_id, 'SMPJDC - Jakarta Design Center', '1', '3', 'A', 'Tangga Sudut BNI 46', 'JDC-LT01-A-3'),
      ('l1-b-4', v_tenant_id, 'SMPJDC - Jakarta Design Center', '1', '4', 'B', 'Tangga Sudut Gardu PLN', 'JDC-LT01-B-4'),
      ('l2-b-5', v_tenant_id, 'SMPJDC - Jakarta Design Center', '2', '5', 'B', 'Tangga Sudut Pantry', 'JDC-LT02-B-5'),
      ('l2-a-6', v_tenant_id, 'SMPJDC - Jakarta Design Center', '2', '6', 'A', 'Tangga Sudut BNI 46', 'JDC-LT02-A-6'),
      ('l3-a-7', v_tenant_id, 'SMPJDC - Jakarta Design Center', '3', '7', 'A', 'Tangga Sudut Staff Security', 'JDC-LT03-A-7'),
      ('l3-b-8', v_tenant_id, 'SMPJDC - Jakarta Design Center', '3', '8', 'B', 'Tangga Sudut Gardu PLN', 'JDC-LT03-B-8'),
      ('l4-b-9', v_tenant_id, 'SMPJDC - Jakarta Design Center', '4', '9', 'B', 'Tangga Sudut Pantry', 'JDC-LT04-B-9'),
      ('l4-a-10', v_tenant_id, 'SMPJDC - Jakarta Design Center', '4', '10', 'A', 'Tangga Sudut BNI 46', 'JDC-LT04-A-10'),
      ('hd-lobby-17', v_tenant_id, 'SMPJDC - Jakarta Design Center', 'Halaman Depan', '17', 'Lobby', 'Luar ATM Bank Mandiri', 'JDC-HD-LOBBY-17'),
      ('hskr-b-30', v_tenant_id, 'SMPJDC - Jakarta Design Center', 'Halaman Samping Kiri', '30', 'B', 'Kopi Tuku', 'JDC-HSKR-B-30')
    ON CONFLICT (id) DO UPDATE SET titik = EXCLUDED.titik, qr_code = EXCLUDED.qr_code;
END $$;

-- 4. REPAIR TRIGGER SYNC (Profiles to JDC Users)
CREATE OR REPLACE FUNCTION public.sync_profile_to_jdc_users()
RETURNS TRIGGER AS $$
DECLARE
    v_division_name TEXT;
BEGIN
    SELECT name INTO v_division_name FROM public.divisions WHERE id = NEW.division_id;
    IF v_division_name ILIKE '%security%' OR v_division_name ILIKE '%satpam%' OR v_division_name ILIKE '%pengamanan%' THEN
        INSERT INTO public.users (id, tenant_id, nrp, nama, jabatan, email, nomor_hp, status)
        VALUES (NEW.id::text, NEW.tenant_id, NEW.nip, NEW.full_name, NEW.role, NEW.email, NEW.phone, 'Aktif')
        ON CONFLICT (nrp) DO UPDATE SET nama = EXCLUDED.nama, jabatan = EXCLUDED.jabatan, updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_profile_to_jdc ON public.profiles;
CREATE TRIGGER tr_sync_profile_to_jdc AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_jdc_users();

-- 5. APPLY SECURITY POLICIES (RLS)
ALTER TABLE public.guard_post_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_duty" ON public.guard_post_assignments;
CREATE POLICY "tenant_isolation_duty" ON public.guard_post_assignments FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

-- Final Schema Refresh
NOTIFY pgrst, 'reload schema';
