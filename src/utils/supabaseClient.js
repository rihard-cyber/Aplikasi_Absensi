import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bhauqlobuiuavaoeoawc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_USBAIKjq_bdE21mRGoxVyA_XGibd9ai';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
