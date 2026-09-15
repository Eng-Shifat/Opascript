/* ================================== */

(function () {
  if (window.scriptoraSupabase) return; // আগেই বানানো থাকলে আবার বানাবে না

  if (typeof supabase === 'undefined') {
    console.error('[Scriptora] Supabase library load হয়নি। supabaseClient.js এর আগে CDN script tag আছে কিনা চেক করুন।');
    return;
  }

  const SUPABASE_URL = 'https://hivrmntxpmpwthmjtoem.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';

  window.scriptoraSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
})();
