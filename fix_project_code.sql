-- ==============================================================================
-- HOTFIX: Tambah kolom code untuk Project (kode unik per cabang)
-- ==============================================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS code VARCHAR(20);
-- Tambah UNIQUE constraint (optional: bisa null untuk project lama)
-- Note: kode bisa null untuk backward compatibility
