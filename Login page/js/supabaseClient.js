/* ============================================
   SCRIPTORA — Shared Supabase Client (supabaseClient.js)

   ⚠️ গুরুত্বপূর্ণ: পুরো site-এ এই ফাইলটাই Supabase client
   বানানোর একমাত্র জায়গা হওয়া উচিত। অন্য কোনো .js ফাইলে
   (auth.js, sidebar.js, admin.js, dashboard.js, navbar.js...)
   আর `supabase.createClient(...)` কল করা যাবে না।

   কারণ: একাধিক client instance (multiple GoTrueClient)
   একই localStorage token নিয়ে independently auto-refresh
   করতে চেষ্টা করলে refresh token rotation race তৈরি হয় —
   একটার refresh সফল হলে আরেকটার কাছে থাকা token "already used"
   ধরে fail করে, এবং Supabase সাথে সাথে session টাকে invalid
   ভেবে মুছে দেয়। এটাই login ↔ admin panel এর infinite loop-এর
   মূল কারণ ছিল।

   HTML-এ load order (এই ক্রমেই থাকতে হবে):
   <script src=".../supabase-js@2/.../supabase.min.js"></script>
   <script src="js/supabaseClient.js"></script>   <!-- এই ফাইল -->
   <script src="js/auth.js"></script>              <!-- বা sidebar.js, admin.js ইত্যাদি -->
   ============================================ */

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
