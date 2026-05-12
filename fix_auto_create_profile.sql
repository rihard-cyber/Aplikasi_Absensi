-- ==============================================================================
-- HOTFIX: Auto-create Profile saat Upload Jadwal + Auto-link saat Registrasi
-- ==============================================================================
-- 1. auth_id jadi nullable (supaya bisa bikin profile tanpa auth)
-- 2. UNIQUE constraint di nip (cegah duplikat)
-- 3. Trigger: saat INSERT profile, cek dulu apakah nip sudah ada → UPDATE instead
-- ==============================================================================

-- 1. BUAT NIP UNIQUE & AUTH_ID NULLABLE
ALTER TABLE public.profiles ALTER COLUMN auth_id DROP NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nip_unique UNIQUE (nip);

-- 2. TRIGGER: Auto-link registrasi (INSERT jadi UPDATE jika nip sudah ada)
CREATE OR REPLACE FUNCTION public.handle_registration_link()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Cari profile dengan nip yang sama dan auth_id masih NULL
  SELECT id INTO v_existing_id FROM public.profiles 
  WHERE nip = NEW.nip AND auth_id IS NULL 
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing profile dengan data registrasi
    UPDATE public.profiles
    SET auth_id = NEW.auth_id,
        full_name = COALESCE(NEW.full_name, full_name),
        email = COALESCE(NEW.email, email),
        device_id = COALESCE(NEW.device_id, device_id),
        profile_photo = COALESCE(NEW.profile_photo, profile_photo)
    WHERE id = v_existing_id;
    RETURN NULL; -- Skip insert
  END IF;

  RETURN NEW; -- Allow insert
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_registration_link ON public.profiles;
CREATE TRIGGER on_registration_link
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_registration_link();
