-- Perbaikan Kolom Jam pada Tabel leave_requests
-- Silahkan jalankan script ini di SQL Editor Supabase Anda

-- 1. Tambahkan kolom start_time dan end_time untuk kebutuhan Lembur/Overtime
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS end_time TIME;

-- 2. Reload schema cache Supabase API agar perubahan langsung terdeteksi
NOTIFY pgrst, 'reload schema';
