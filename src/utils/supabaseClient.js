import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log URL yang dipakai (tampil di browser console)
console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.replace(/\/\/(.{8}).*\.supabase/, '//$1****.supabase') : 'TIDAK ADA');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sebelum menjalankan aplikasi.');
}

// Deteksi placeholder/nilai palsu
if (supabaseUrl.includes('your-') || supabaseUrl.includes('placeholder') || supabaseUrl === 'https://your-production-project.supabase.co') {
  throw new Error('VITE_SUPABASE_URL masih berisi nilai placeholder. Set GitHub Secret yang benar!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
if (typeof window !== 'undefined') window.supabase = supabase;
