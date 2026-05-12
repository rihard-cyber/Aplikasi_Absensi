-- Perbaikan Kolom Tanggal pada Tabel employee_documents
-- Silahkan jalankan script ini di SQL Editor Supabase Anda

-- 1. Ubah nama kolom uploaded_at menjadi created_at agar seragam dengan tabel lainnya dan kode frontend
ALTER TABLE public.employee_documents RENAME COLUMN uploaded_at TO created_at;

-- 2. Reload schema cache Supabase API agar perubahan langsung terdeteksi
NOTIFY pgrst, 'reload schema';
