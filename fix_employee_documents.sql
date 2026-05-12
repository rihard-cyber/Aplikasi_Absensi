-- Perbaikan Kolom Tabel employee_documents
-- Silahkan jalankan script ini di SQL Editor Supabase Anda

-- 1. Ubah nama kolom document_type menjadi doc_type agar sesuai dengan kode frontend
ALTER TABLE public.employee_documents RENAME COLUMN document_type TO doc_type;

-- 2. Reload schema cache Supabase API agar perubahan langsung terdeteksi
NOTIFY pgrst, 'reload schema';
