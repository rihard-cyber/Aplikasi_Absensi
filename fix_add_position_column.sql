-- ==============================================================================
-- HOTFIX: Tambah kolom position/jabatan di tabel profiles
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- Update existing records: isi position dari role sebagai default
UPDATE public.profiles SET position = 
  CASE 
    WHEN role = 'SUPER_ADMIN' THEN 'Super Administrator'
    WHEN role = 'TENANT_ADMIN' THEN 'Admin Perusahaan'
    WHEN role = 'SUB_ADMIN' THEN 'Supervisor'
    WHEN role = 'EMPLOYEE' THEN 'Staff'
    ELSE role
  END
WHERE position IS NULL;
