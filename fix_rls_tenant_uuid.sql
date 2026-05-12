-- ==============================================================================
-- HOTFIX: RLS Tenant Insert Gagal - Hardcoded UUID tidak cocok dengan auth.users
-- ==============================================================================
-- Penyebab: Seed data di ultimate_master_schema.sql menggunakan hardcoded UUID
-- 'a0b37ccd-fdec-4830-a349-d57c0ee46616' tapi auth.users asli punya UUID berbeda.
-- Akibatnya: Profile SUPER_ADMIN tidak terhubung ke user yang login → RLS blokir INSERT.
-- ==============================================================================

DO $$
DECLARE
  v_auth_id UUID;
  v_email TEXT := 'richardpl.meha@gmail.com';
BEGIN
  -- Cari UUID asli user di auth.users berdasarkan email
  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
  
  IF v_auth_id IS NOT NULL THEN
    -- Update profile dengan auth_id yang benar
    INSERT INTO public.profiles (auth_id, email, full_name, role, attendance_access, operational_access)
    VALUES (v_auth_id, v_email, 'RICHARD MEHA GOD MODE', 'SUPER_ADMIN', true, true)
    ON CONFLICT (auth_id) DO UPDATE 
    SET role = 'SUPER_ADMIN', 
        attendance_access = true, 
        operational_access = true, 
        full_name = 'RICHARD MEHA GOD MODE',
        email = v_email;
    
    RAISE NOTICE 'SUCCESS: Profile updated for auth_id %', v_auth_id;
  ELSE
    RAISE WARNING 'User with email % not found in auth.users. Silakan daftar/login dulu.', v_email;
  END IF;
END;
$$;

-- Hapus profile dengan auth_id hardcoded yang salah (jika ada)
DELETE FROM public.profiles 
WHERE auth_id = 'a0b37ccd-fdec-4830-a349-d57c0ee46616' 
  AND auth_id NOT IN (SELECT id FROM auth.users);
