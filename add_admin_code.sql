-- Tambahkan kolom admin_code di tabel tenants
-- Jalankan di Supabase SQL Editor

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS admin_code VARCHAR(100);

-- Contoh: generate admin_code untuk tenant yang sudah ada (opsional)
-- UPDATE public.tenants SET admin_code = 'ADM-' || substring(id::text, 1, 8) WHERE admin_code IS NULL;
