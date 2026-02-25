import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ⚠️ PALITAN ITO NG TOTOONG URL AT ANON KEY MO GALING SA SUPABASE DASHBOARD
const supabaseUrl = 'https://yaqpvcriphvcqdmpsfxa.supabase.co';
const supabaseAnonKey = 'sb_publishable_di2DEocf3L8DH9XUyy9CPg_r4uU0xQj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});