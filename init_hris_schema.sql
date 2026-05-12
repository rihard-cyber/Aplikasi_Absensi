-- Tambahan Tabel employee_hris_data
-- Silahkan jalankan script ini di SQL Editor Supabase Anda

CREATE TABLE IF NOT EXISTS public.employee_hris_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Data Pribadi Utama
  ktp_number VARCHAR(50),
  birth_place VARCHAR(100),
  religion VARCHAR(50),
  marriage_status VARCHAR(20), -- K, TK
  children_count INT DEFAULT 0,
  tax_status VARCHAR(20), -- K-0, K-1, TK-0, dll
  mother_name VARCHAR(150),
  
  -- Pendidikan
  education_level VARCHAR(50),
  major VARCHAR(100),
  school_name VARCHAR(150),
  
  -- Status Kepegawaian & Kontrak
  join_date DATE,
  employee_status VARCHAR(50), -- PKWT, PKWTT, TETAP, INTERN
  contract_end_date DATE,
  permanent_date DATE,
  resign_date DATE,
  
  -- Dokumen Identitas Lain
  kk_number VARCHAR(50),
  npwp_number VARCHAR(50),
  passport_number VARCHAR(50),
  
  -- BPJS & Asuransi
  bpjs_tk_number VARCHAR(50),
  bpjs_kes_number VARCHAR(50),
  other_insurance_name VARCHAR(100),
  other_insurance_number VARCHAR(50),
  
  -- Data Bank
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(100),
  bank_account_name VARCHAR(150),
  bank_branch VARCHAR(100),
  
  -- Alamat & Kontak
  ktp_address TEXT,
  postal_code VARCHAR(20),
  domicile_address TEXT,
  mobile_phone VARCHAR(50), -- NO HP
  emergency_contact_name VARCHAR(150),
  emergency_contact_relation VARCHAR(50),
  emergency_contact_number VARCHAR(50),
  
  -- Seragam & Perlengkapan
  shirt_size VARCHAR(10),
  pants_size VARCHAR(10),
  shoes_size VARCHAR(10),
  
  -- Spesifik Satpam / Security
  kta_number VARCHAR(100),
  certificate_number VARCHAR(100),
  certificate_issued_date DATE,
  certificate_expiry_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Buka akses RLS
ALTER TABLE public.employee_hris_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hris data" ON public.employee_hris_data
  FOR SELECT USING (auth.uid() IN (SELECT auth_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can insert own hris data" ON public.employee_hris_data
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can update own hris data" ON public.employee_hris_data
  FOR UPDATE USING (auth.uid() IN (SELECT auth_id FROM profiles WHERE id = user_id));

-- SubAdmin dan Tenant Admin bisa membaca (Read) semua data HRIS
CREATE POLICY "Admins can view all hris data" ON public.employee_hris_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_id = auth.uid() 
      AND (role = 'SUB_ADMIN' OR role = 'TENANT_ADMIN' OR role = 'SUPER_ADMIN')
    )
  );

NOTIFY pgrst, 'reload schema';
