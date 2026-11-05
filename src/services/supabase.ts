import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vmkwotxrpwpcahxqwikg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ISBRYH7CmpYV5zpIdVZ96g_r4FOpyp_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
