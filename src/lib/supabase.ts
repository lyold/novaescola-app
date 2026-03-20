import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl =
  (Constants.expoConfig?.extra?.supabaseUrl as string) ||
  'https://stszoijrhrblcdqnrqxj.supabase.co';

const supabaseKey =
  (Constants.expoConfig?.extra?.supabaseKey as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c3pvaWpyaHJibGNkcW5ycXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTc5MzYsImV4cCI6MjA3MDE3MzkzNn0.j9f1SeUmsETiT7iJrHz3qYcZG71UHbad9y_1DsnoswQ';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Garante uso do fetch nativo do RN 0.81 sem modificar URL
    fetch: fetch.bind(globalThis),
  },
});
