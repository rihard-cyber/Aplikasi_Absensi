-- ========================================================
-- JDC MODULES MIGRATION & SEEDING FOR SMP JDC
-- Run this in your Supabase SQL Editor
-- ========================================================

-- 1. Table: pos_list (Guard Posts)
CREATE TABLE IF NOT EXISTS public.pos_list (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  lantai TEXT,
  titik TEXT,
  keterangan TEXT,
  kode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firebase_saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: areas (JDC checkpoint barcodes)
CREATE TABLE IF NOT EXISTS public.areas (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  gedung TEXT,
  lantai TEXT,
  nomor_titik TEXT,
  zona TEXT,
  titik TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firebase_saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: complaints
CREATE TABLE IF NOT EXISTS public.complaints (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  ticket_id TEXT,
  name TEXT,
  phone TEXT,
  tenant TEXT,
  floor TEXT,
  location TEXT,
  category TEXT,
  description TEXT,
  department TEXT,
  status TEXT,
  remarks TEXT,
  wa_status TEXT,
  wa_sent_at TEXT,
  photos TEXT[],
  history JSONB,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firebase_saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: findings
CREATE TABLE IF NOT EXISTS public.findings (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  report_id TEXT,
  kategori TEXT,
  area TEXT,
  tanggal TEXT,
  pelapor TEXT,
  nrp TEXT,
  nomor_hp TEXT,
  shift TEXT,
  regu TEXT,
  status TEXT,
  severity TEXT,
  detail TEXT,
  foto TEXT,
  department TEXT,
  wa_status TEXT,
  wa_sent_at TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firebase_saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: patrol_reports
CREATE TABLE IF NOT EXISTS public.patrol_reports (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id TEXT UNIQUE,
  user_id INT,
  user_name TEXT,
  nrp TEXT,
  nomor_hp TEXT,
  shift TEXT,
  regu TEXT,
  area_id TEXT,
  gedung TEXT,
  lantai TEXT,
  zona TEXT,
  titik TEXT,
  kondisi TEXT,
  keterangan TEXT,
  foto TEXT,
  severity TEXT,
  timestamp TIMESTAMPTZ,
  timestamp_end TIMESTAMPTZ,
  date TEXT,
  time TEXT,
  kategori TEXT,
  kode_temuan TEXT,
  temuan TEXT,
  status TEXT,
  anti_fraud JSONB,
  jabatan TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firebase_saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: rosters
CREATE TABLE IF NOT EXISTS public.rosters (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month TEXT UNIQUE,
  roster_data JSONB,
  updated_by TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table: config
CREATE TABLE IF NOT EXISTS public.config (
  supabase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE,
  data JSONB,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pos_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Create Security Policies (Tenant Isolation)
DROP POLICY IF EXISTS "tenant_isolation_pos_list" ON public.pos_list;
CREATE POLICY "tenant_isolation_pos_list" ON public.pos_list 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_areas" ON public.areas;
CREATE POLICY "tenant_isolation_areas" ON public.areas 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_complaints" ON public.complaints;
CREATE POLICY "tenant_isolation_complaints" ON public.complaints 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_findings" ON public.findings;
CREATE POLICY "tenant_isolation_findings" ON public.findings 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_patrol_reports" ON public.patrol_reports;
CREATE POLICY "tenant_isolation_patrol_reports" ON public.patrol_reports 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_rosters" ON public.rosters;
CREATE POLICY "tenant_isolation_rosters" ON public.rosters 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "tenant_isolation_config" ON public.config;
CREATE POLICY "tenant_isolation_config" ON public.config 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

-- Grant permissions to anonymous and authenticated users
GRANT ALL ON public.pos_list TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.areas TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.complaints TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.findings TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.patrol_reports TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.rosters TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.config TO postgres, anon, authenticated, service_role;

-- 8. Seed guard posts (pos_list) for SMP JDC tenant
INSERT INTO public.pos_list (id, tenant_id, lantai, titik, keterangan, kode)
VALUES 
  ('pos-jdc', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Pos JDC', 'Pos JDC', 'Pos jaga utama JDC', 'PJDC'),
  ('pos-00-area', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Basement', 'Pos 00 Area', 'Pos area basement', 'P00A'),
  ('pos-00-lift-bsmt', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Basement', 'Pos 00 Lift Basement', 'Pos lift basement', 'P00L'),
  ('pos-01-lift', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', '1', 'Pos 01 Lift (Pintu sudut)', 'Pos lift lantai 1 pintu sudut', 'P01L'),
  ('pos-01-lobby', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', '1', 'Pos 01 Lobby', 'Pos lobby utama lantai 1', 'P01'),
  ('pos-23-area', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', '2 & 3', 'Pos 2/3 area', 'Pos jaga lantai 2 dan 3', 'P23'),
  ('pos-45-area', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', '4 & 5', 'Pos 4/5 Area', 'Pos jaga lantai 4 dan 5', 'P45'),
  ('pos-67-area', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', '6 & 7', 'Pos 6/7 Area', 'Pos jaga lantai 6 dan 7', 'P67'),
  ('pos-pk-mobil', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Parkir', 'Pos PK mobil', 'Pos parkir mobil', 'PKM'),
  ('pos-08a', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Halaman Depan', 'Pos 08A', 'Pos depan area A', 'P08A'),
  ('pos-08b', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Halaman Depan', 'Pos 08B', 'Pos depan area B', 'P08B'),
  ('pos-08c', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Halaman Depan', 'Pos 08C', 'Pos depan area C', 'P08C'),
  ('pos-09-area', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Halaman Belakang', 'Pos 09 Area', 'Pos area belakang', 'P09'),
  ('pos-pk-motor', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Parkir', 'Pos PK motor', 'Pos parkir motor', 'PKMR'),
  ('pos-motor', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'Parkir', 'Pos Motor', 'Pos motor', 'PMTR')
ON CONFLICT (id) DO UPDATE SET
  lantai = EXCLUDED.lantai,
  titik = EXCLUDED.titik,
  keterangan = EXCLUDED.keterangan,
  kode = EXCLUDED.kode;

-- 9. Seed areas (checkpoint barcodes) for SMP JDC tenant
INSERT INTO public.areas (id, tenant_id, gedung, lantai, nomor_titik, zona, titik, qr_code)
VALUES 
  ('bsmt-b-1', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Basement', '1', 'B', 'Depan R. Elektrik', 'JDC-BSMT-B-1'),
  ('bsmt-a-2', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Basement', '2', 'A', 'R. Ganti Pakaian Security', 'JDC-BSMT-A-2'),
  ('l1-a-3', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '1', '3', 'A', 'Tangga Sudut BNI 46', 'JDC-LT01-A-3'),
  ('l1-b-4', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '1', '4', 'B', 'Tangga Sudut Gardu PLN', 'JDC-LT01-B-4'),
  ('l2-b-5', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '2', '5', 'B', 'Tangga Sudut Pantry', 'JDC-LT02-B-5'),
  ('l2-a-6', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '2', '6', 'A', 'Tangga Sudut BNI 46', 'JDC-LT02-A-6'),
  ('l3-a-7', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '3', '7', 'A', 'Tangga Sudut Staff Security', 'JDC-LT03-A-7'),
  ('l3-b-8', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '3', '8', 'B', 'Tangga Sudut Gardu PLN', 'JDC-LT03-B-8'),
  ('l4-b-9', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '4', '9', 'B', 'Tangga Sudut Pantry', 'JDC-LT04-B-9'),
  ('l4-a-10', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '4', '10', 'A', 'Tangga Sudut BNI 46', 'JDC-LT04-A-10'),
  ('l5-b-11', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '5', '11', 'B', 'Tangga Sudut Gardu PLN', 'JDC-LT05-B-11'),
  ('l5-a-12', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '5', '12', 'A', 'Tangga Sudut R. Rapat JDC OFFICE Office', 'JDC-LT05-A-12'),
  ('l6-a-13', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '6', '13', 'A', 'Tangga Sudut Mushola', 'JDC-LT06-A-13'),
  ('l6-b-14', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', '6', '14', 'B', 'Depan Gudang Banquet / R.Carnition', 'JDC-LT06-B-14'),
  ('hd-c-15', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Depan', '15', 'C', 'Coridor IAI DKI', 'JDC-HD-C-15'),
  ('hd-a-16', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Depan', '16', 'A', 'Ruang Chiller', 'JDC-HD-A-16'),
  ('hd-lobby-17', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Depan', '17', 'Lobby', 'Luar ATM Bank Mandiri', 'JDC-HD-LOBBY-17'),
  ('hd-hd-18', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Depan', '18', 'Halaman Depan', 'Pos Keluar', 'JDC-HD-HD-18'),
  ('hd-hd-19', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Depan', '19', 'Halaman Depan', 'Pos Masuk', 'JDC-HD-HD-19'),
  ('hskn-a-20', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Samping Kanan', '20', 'A', 'Tiang Canopy Basement', 'JDC-HSKN-A-20'),
  ('hskn-ps-21', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Samping Kanan', '21', 'Posco Security', 'Posco OO', 'JDC-HSKN-PS-21'),
  ('hskn-pt-22', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Samping Kanan', '22', 'Petugas Teknik', 'R. Teknik', 'JDC-HSKN-PT-22'),
  ('hb-hb-23', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '23', 'Halaman Belakang', 'Tembok Belakang Gardu Genset', 'JDC-HB-HB-23'),
  ('hb-hb-24', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '24', 'Halaman Belakang', 'Tembok Ujung Parkir Motor', 'JDC-HB-HB-24'),
  ('hb-hb-25', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '25', 'Halaman Belakang', 'Tembok Depan Gardu PLN', 'JDC-HB-HB-25'),
  ('hb-hb-26', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '26', 'Halaman Belakang', 'Kantin Belakang', 'JDC-HB-HB-26'),
  ('hb-lp-27', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '27', 'Lapangan Padel', 'Lap Padel I', 'JDC-HB-LP-27'),
  ('hb-lp-28', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '28', 'Lapangan Padel', 'Lap Padel II', 'JDC-HB-LP-28'),
  ('hb-ap-29', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Belakang', '29', 'Area Padel', 'Pintu Padel', 'JDC-HB-AP-29'),
  ('hskr-b-30', 'd9b1c7d2-0e9a-4830-a349-d57c0ee46616', 'SMPJDC - Jakarta Design Center', 'Halaman Samping Kiri', '30', 'B', 'Kopi Tuku', 'JDC-HSKR-B-30')
ON CONFLICT (id) DO UPDATE SET
  gedung = EXCLUDED.gedung,
  lantai = EXCLUDED.lantai,
  nomor_titik = EXCLUDED.nomor_titik,
  zona = EXCLUDED.zona,
  titik = EXCLUDED.titik,
  qr_code = EXCLUDED.qr_code;
