-- Perbaikan Kolom Tabel leave_requests
-- Silahkan jalankan script ini di SQL Editor Supabase Anda

-- 1. Ubah nama kolom attachment_url menjadi file_url
ALTER TABLE public.leave_requests RENAME COLUMN attachment_url TO file_url;

-- 2. Tambahkan kolom untuk mendukung fitur Tukar Shift
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_shift_swap BOOLEAN DEFAULT false;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS target_date DATE;

-- 3. Reload schema cache Supabase API agar perubahan langsung terdeteksi
NOTIFY pgrst, 'reload schema';
