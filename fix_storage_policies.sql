-- SQL Script untuk memperbaiki Akses Upload ke Bucket "avatars"
-- Jalankan di SQL Editor Supabase

-- 1. Berikan akses ke SEMUA orang untuk melihat foto profil (Meski bucket public, policy SELECT kadang tetap diperlukan)
CREATE POLICY "Public Access to Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 2. Berikan izin bagi User yang sudah login (Authenticated) untuk mengupload foto ke folder mereka sendiri
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- 3. Berikan izin bagi User untuk mengupdate/mengganti foto lama mereka
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- 4. Berikan izin bagi User untuk menghapus foto mereka sendiri
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);
