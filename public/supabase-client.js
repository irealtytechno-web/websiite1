window.getSupabase = function () {
  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes('YOUR-PROJECT') || !window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY.includes('YOUR-ANON')) {
    throw new Error('Supabase is not configured. Update public/supabase-config.js first.');
  }
  return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
};
