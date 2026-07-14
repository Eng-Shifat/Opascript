/* ================================================================
   SCRIPTORA — shared/chatWidget.js
   Unified Chat Widget: AI Assistant + Human Live Chat (coexisting)

   Usage: <script src="../shared/chatWidget.js"></script>
   (এই script tag-এর আগে অবশ্যই supabase-js CDN +
    ../shared/supabaseClient.js load করা থাকতে হবে,
    না হলে widget local-only mode-এ চলবে — lead/message
    Supabase-এ save হবে না, শুধু UI কাজ করবে।)

   DB tables লাগবে (shared/chat-widget-schema.sql দেখুন):
     - website_chat_leads
     - website_chat_messages

   Design tokens এখানে Service page-এর design system (Stripe/Linear/
   Framer inspired) থেকে নেওয়া — --bg #070B17, --card #101826,
   --accent #8B5CF6 → #6D5EF6, spacing scale 8/16/24/32.

   ------------------------------------------------------------------
   ARCHITECTURE (v2 — modular)
   ------------------------------------------------------------------
   This file now renders ONE widget with TWO modes that share the same
   shell (toggle button, panel, header, footer):

     • AI MODE     — hero, quick actions, topic pills, AI conversation.
                      Fully client-side today (canned replies). The one
                      place to wire a real AI backend is marked
                      "AI RESPONSE ENGINE" below.

     • HUMAN MODE  — the original pre-chat form + live Supabase-backed
                      chat thread. Untouched behavior — same DB tables,
                      same realtime subscription, same resolve-prompt
                      flow as before this refactor.

   A small mode-switcher (two tabs) lets the visitor move between the
   two freely without losing state in either — both views stay alive
   in the DOM, only visibility toggles.

   Section map (search these headers to jump around):
     1. CONFIG
     2. STYLES
     3. MARKUP
     4. BOOTSTRAP (inject CSS/HTML)
     5. WIDGET INIT
        5a. Shared shell (open/close, greeting bubble, mode tabs)
        5b. AI ASSISTANT MODULE
        5c. HUMAN LIVE CHAT MODULE (preserved from v1)
        5d. MODE SWITCHER
   ================================================================ */

(function () {

  /* ================================================================
     1. CONFIG
     ================================================================ */

  /* ── কোন page থেকে chat শুরু হচ্ছে (lead-এর সাথে save হবে) ── */
  const path = window.location.pathname;
  const pageSource = path.includes('Homepage')    ? 'Homepage'
                    : path.includes('Service page') ? 'Thesis Writing Page'
                    : 'Other';

  /* ── Business hours (24h, Bangladesh time) — চাইলে এখানেই বদলান ── */
  const ONLINE_START_HOUR = 10; // সকাল ১০টা
  const ONLINE_END_HOUR   = 22; // রাত ১০টা
  function isOnlineNow() {
    const bdHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false });
    const h = parseInt(bdHour, 10);
    return h >= ONLINE_START_HOUR && h < ONLINE_END_HOUR;
  }

  const DEPT_REPLIES = {
    'Thesis Writing':   'Thesis Writing team-কে notify করা হয়েছে। আমাদের একজন thesis specialist শীঘ্রই আপনাকে reply করবেন।',
    'Assignment Help':  'Assignment Help team-কে notify করা হয়েছে। শীঘ্রই একজন expert আপনার সাথে যোগাযোগ করবেন।',
    'Order & Payment':  'Order & Payment team-কে notify করা হয়েছে। আমরা আপনার query দ্রুত দেখছি।',
    'General Inquiry':  'আপনার message আমাদের কাছে পৌঁছে গেছে। আমরা শীঘ্রই reply করবো।',
  };

  /* ── AI RESPONSE ENGINE (canned today — swap for a real backend call)
     Each key matches a data-ai-action on a quick-action card. To wire a
     real AI/backend: replace the body of `getAiResponse()` (Section 5b)
     with a fetch() to your endpoint; nothing else needs to change. ── */
  const AI_RESPONSES = {
    'consultation': { text: "Happy to help. What's your target deadline, and do you already have a supervisor-approved topic?" },
    'estimate':     { text: 'Sure — which service, academic level, and roughly how many words do you need?' },
    'samples':      { text: 'Here are a few recent samples from writers in your field. Want me to filter by department?' },
    'compare':      { text: "Here's how our packages compare for a typical thesis:", card: 'estimate' },
    'default':      { text: 'Got it — let me look into that for you.' },
  };

  /* Quick actions that hand off to the real (Supabase-backed) human
     flow instead of staying in the AI thread — these two are the only
     ones that actually start an order / reach a person today. */
  const AI_HANDOFF_ACTIONS = { 'start-order': true, 'handoff': true };

  const TOPIC_PROMPTS = {
    honours:  'Tell me about Honours thesis writing.',
    masters:  'Tell me about Masters thesis writing.',
    proposal: 'I need help with a research proposal.',
    spss:     'I need SPSS / data analysis help.',
    turnitin: 'How does your Turnitin check work?',
    faq:      'What are your frequently asked questions?',
  };

  /* ================================================================
     2. STYLES
     ================================================================ */

  const css = `
  #scw-root {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    font-family: 'Inter', 'Segoe UI', 'Kalpurush', sans-serif;
    --scw-bg: #070B17;
    --scw-card: #101826;
    --scw-card-2: #0c1320;
    --scw-border: rgba(255,255,255,0.08);
    --scw-border-strong: rgba(139,92,246,0.35);
    --scw-accent: #8B5CF6;
    --scw-accent-2: #6D5EF6;
    --scw-highlight: #A855F7;
    --scw-success: #22C55E;
    --scw-danger: #F87171;
    --scw-text: #FFFFFF;
    --scw-text-2: #9CA3AF;
    --scw-text-3: #6E7290;
  }

  /* ---------- Toggle button ---------- */
  .scw-toggle {
    position: relative;
    width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
    background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2));
    box-shadow: 0 10px 28px rgba(139,92,246,0.4), 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    color: #fff; transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease;
  }
  .scw-toggle::before {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    border: 1.5px solid rgba(139,92,246,0.55);
    animation: scw-pulse-ring 2.6s ease-out infinite;
  }
  #scw-root.scw-open .scw-toggle::before { display: none; }
  @keyframes scw-pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.7; }
    70%  { transform: scale(1.18); opacity: 0; }
    100% { transform: scale(1.18); opacity: 0; }
  }
  .scw-toggle:hover { transform: scale(1.07); box-shadow: 0 12px 32px rgba(139,92,246,0.5), 0 2px 6px rgba(0,0,0,0.35); }
  .scw-toggle:active { transform: scale(0.96); }
  #scw-root.scw-open .scw-toggle {
    opacity: 0; transform: scale(0.4); pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .scw-toggle svg { width: 25px; height: 25px; position: absolute; transition: opacity 0.25s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1); }
  .scw-toggle .scw-icon-close { opacity: 0; transform: rotate(-90deg) scale(0.6); }
  .scw-toggle .scw-icon-chat  { opacity: 1; transform: rotate(0) scale(1); }
  #scw-root.scw-open .scw-toggle .scw-icon-chat  { opacity: 0; transform: rotate(90deg) scale(0.6); }
  #scw-root.scw-open .scw-toggle .scw-icon-close { opacity: 1; transform: rotate(0) scale(1); }

  /* ---------- Greeting bubble ---------- */
  .scw-bubble {
    position: absolute; bottom: 74px; right: 2px;
    max-width: 220px;
    background: var(--scw-card); border: 1px solid var(--scw-border);
    color: var(--scw-text); padding: 12px 16px; border-radius: 14px 14px 4px 14px;
    font-size: 13px; line-height: 1.5; box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    opacity: 0; transform: translateY(8px) scale(0.94); transform-origin: bottom right;
    pointer-events: none;
    transition: opacity 0.35s cubic-bezier(.34,1.56,.64,1), transform 0.35s cubic-bezier(.34,1.56,.64,1);
  }
  .scw-bubble.scw-show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; cursor: pointer; }
  .scw-bubble:hover { border-color: rgba(139,92,246,0.4); }

  /* ---------- Panel ---------- */
  .scw-panel {
    position: fixed; bottom: 24px; right: 24px;
    width: 388px; max-width: calc(100vw - 32px);
    height: 680px; max-height: calc(100vh - 48px); min-height: 480px;
    overscroll-behavior: contain;
    background: var(--scw-bg);
    background-image: radial-gradient(120% 100% at 100% 0%, rgba(139,92,246,0.16), transparent 55%);
    border: 1px solid var(--scw-border); border-radius: 20px; overflow: hidden;
    box-shadow: 0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02);
    display: flex; flex-direction: column;
    transform-origin: bottom right;
    transform: translateY(16px) scale(0.85);
    opacity: 0; visibility: hidden; pointer-events: none;
    transition: transform 0.38s cubic-bezier(.2,1,.3,1), opacity 0.24s ease, visibility 0s linear 0.38s;
    z-index: 9998;
  }
  #scw-root.scw-open .scw-panel {
    transform: translateY(0) scale(1);
    opacity: 1; visibility: visible; pointer-events: auto;
    transition: transform 0.42s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease, visibility 0s linear 0s;
  }

  /* ---------- Header ---------- */
  .scw-header {
    background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2));
    padding: 18px 20px; display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; gap: 12px;
  }
  .scw-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .scw-avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; position: relative;
    background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.3);
    display: flex; align-items: center; justify-content: center;
  }
  .scw-avatar svg {
    width: 19px; height: 19px; color: #fff; position: absolute;
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(.34,1.56,.64,1);
  }
  /* Two icons live inside the same avatar; mode class swaps which is visible
     (same cross-fade pattern already used on the toggle button icons). */
  .scw-avatar-icon-ai   { opacity: 0; transform: scale(0.6) rotate(-10deg); }
  .scw-avatar-icon-human{ opacity: 1; transform: scale(1) rotate(0); }
  #scw-root.scw-mode-ai .scw-avatar-icon-ai    { opacity: 1; transform: scale(1) rotate(0); }
  #scw-root.scw-mode-ai .scw-avatar-icon-human { opacity: 0; transform: scale(0.6) rotate(10deg); }

  .scw-header-text { min-width: 0; }
  .scw-header-title-row { display: flex; align-items: center; gap: 7px; }
  .scw-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--scw-success); flex-shrink: 0; box-shadow: 0 0 0 3px rgba(74,222,128,0.28); }
  .scw-status-dot.scw-offline { background: var(--scw-danger); box-shadow: 0 0 0 3px rgba(248,113,113,0.25); }
  .scw-header-title { color: #fff; font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em; }
  .scw-header-status { color: rgba(255,255,255,0.85); font-size: 11.5px; margin-top: 2px; }
  .scw-header-close {
    background: rgba(255,255,255,0.14); border: none; color: #fff; cursor: pointer;
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; padding: 0;
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .scw-header-close:hover { background: rgba(255,255,255,0.24); transform: scale(1.08) rotate(90deg); }
  .scw-header-close svg { width: 14px; height: 14px; }

  /* ---------- Mode tabs (AI Assistant <-> Live Chat) ---------- */
  .scw-mode-tabs {
    display: flex; gap: 6px; padding: 10px 20px 0;
    flex-shrink: 0; background: var(--scw-bg);
  }
  .scw-mode-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
    font-family: inherit; font-size: 11.5px; font-weight: 600; letter-spacing: 0.01em;
    color: var(--scw-text-2); background: rgba(255,255,255,0.03);
    border: 1px solid var(--scw-border); border-radius: 10px 10px 0 0; border-bottom: none;
    padding: 8px 6px; cursor: pointer; position: relative;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .scw-mode-tab:hover { color: var(--scw-text); background: rgba(255,255,255,0.06); }
  .scw-mode-tab.scw-tab-active {
    color: #fff; background: var(--scw-card);
    border-color: var(--scw-border-strong);
  }
  .scw-tab-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--scw-highlight);
    display: none; flex-shrink: 0;
  }
  .scw-mode-tab.scw-tab-unread .scw-tab-dot { display: block; }

  /* ---------- Body (shared scroll container) ---------- */
  .scw-body { flex: 1; overflow-y: auto; padding: 24px; overscroll-behavior: contain; background: var(--scw-card); }
  .scw-body::-webkit-scrollbar { width: 5px; }
  .scw-body::-webkit-scrollbar-track { background: transparent; }
  .scw-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 10px; }

  /* ================================================================
     AI VIEW
     ================================================================ */

  .scw-ai-view { display: flex; flex-direction: column; gap: 18px; }

  .scw-ai-hero {
    overflow: hidden; max-height: 420px; opacity: 1;
    display: flex; flex-direction: column; gap: 16px;
    transition: max-height 0.32s ease-in-out, opacity 0.2s ease-in-out, margin 0.32s ease-in-out;
  }
  .scw-ai-hero.scw-collapsed { max-height: 0; opacity: 0; margin: 0; }

  .scw-ai-headline { font-size: 16px; font-weight: 700; line-height: 1.35; color: var(--scw-text); }
  .scw-ai-sub { font-size: 12px; color: var(--scw-text-2); margin-top: 6px; line-height: 1.55; }

  .scw-proof-strip { display: flex; gap: 8px; flex-wrap: wrap; font-size: 10.5px; color: var(--scw-text-3); }
  .scw-proof-strip b { color: var(--scw-text-2); font-weight: 700; }

  .scw-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .scw-qcard {
    background: rgba(255,255,255,0.03); border: 1px solid var(--scw-border); border-radius: 14px;
    padding: 12px; display: flex; flex-direction: column; gap: 5px; text-align: left; cursor: pointer;
    color: inherit; font-family: inherit;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }
  .scw-qcard:hover { border-color: var(--scw-border-strong); box-shadow: 0 8px 20px rgba(139,92,246,0.15); transform: translateY(-2px); background: rgba(255,255,255,0.05); }
  .scw-qcard:active { transform: scale(0.98); }
  .scw-qcard.scw-qcard-primary {
    background: linear-gradient(135deg, rgba(139,92,246,0.22), rgba(109,94,246,0.1));
    border-color: var(--scw-border-strong);
  }
  .scw-qcard-icon { font-size: 15px; color: var(--scw-highlight); }
  .scw-qcard-title { font-size: 12.5px; font-weight: 700; color: var(--scw-text); }
  .scw-qcard-desc { font-size: 10.5px; color: var(--scw-text-3); line-height: 1.4; }

  .scw-pills { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .scw-pills::-webkit-scrollbar { display: none; }
  .scw-pill {
    flex-shrink: 0; font-size: 11px; color: var(--scw-text-2); background: transparent;
    border: 1px solid var(--scw-border); border-radius: 999px; padding: 6px 12px; white-space: nowrap;
    cursor: pointer; font-family: inherit; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .scw-pill:hover { background: rgba(139,92,246,0.1); }
  .scw-pill.scw-pill-active { background: rgba(139,92,246,0.2); border-color: var(--scw-border-strong); color: #fff; }

  .scw-ai-thread { display: flex; flex-direction: column; gap: 12px; }
  .scw-ai-row { display: flex; gap: 8px; align-items: flex-end; animation: scw-msg-in 0.3s cubic-bezier(.2,1,.3,1); }
  .scw-ai-row.scw-ai-row-user { justify-content: flex-end; }
  .scw-ai-avatar-sm { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2)); }
  .scw-ai-bubble { max-width: 80%; font-size: 13px; line-height: 1.5; padding: 9px 13px; border-radius: 14px; }
  .scw-ai-bubble.scw-ai-bubble-bot { background: rgba(255,255,255,0.04); border: 1px solid var(--scw-border); color: rgba(255,255,255,0.92); border-bottom-left-radius: 4px; }
  .scw-ai-bubble.scw-ai-bubble-user { background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2)); color: #fff; border-bottom-right-radius: 4px; }

  .scw-ai-typing { display: flex; gap: 3px; padding: 2px 0; }
  .scw-ai-typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--scw-text-2); opacity: 0.4; animation: scw-typing-dot 1s ease-in-out infinite; }
  .scw-ai-typing span:nth-child(2) { animation-delay: 0.15s; }
  .scw-ai-typing span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes scw-typing-dot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }

  .scw-ai-estimate { background: rgba(255,255,255,0.04); border: 1px solid var(--scw-border-strong); border-radius: 14px; padding: 13px; display: flex; flex-direction: column; gap: 9px; margin-top: 8px; }
  .scw-ai-estimate-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--scw-text-2); }
  .scw-ai-estimate-row b { color: var(--scw-text); font-weight: 600; }
  .scw-ai-estimate-total { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--scw-border); padding-top: 9px; }
  .scw-ai-estimate-price { font-size: 18px; font-weight: 700; background: linear-gradient(135deg, var(--scw-accent), var(--scw-highlight)); -webkit-background-clip: text; background-clip: text; color: transparent; }

  /* ---------- AI input row ---------- */
  .scw-ai-input-row { display: none; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--scw-border); flex-shrink: 0; background: var(--scw-card-2); }
  .scw-ai-input-row input {
    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--scw-border);
    border-radius: 22px; padding: 11px 16px; color: var(--scw-text); font-family: inherit; font-size: 13.5px; outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .scw-ai-input-row input::placeholder { color: rgba(255,255,255,0.32); }
  .scw-ai-input-row input:focus { border-color: var(--scw-accent); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
  .scw-ai-input-row input:disabled { opacity: 0.5; }
  .scw-ai-input-row button {
    width: 38px; height: 38px; border-radius: 50%; border: none; flex-shrink: 0;
    background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2)); color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), opacity 0.15s ease;
  }
  .scw-ai-input-row button:disabled { opacity: 0.45; cursor: default; }
  .scw-ai-input-row button:hover:not(:disabled) { transform: scale(1.08); }
  .scw-ai-input-row button:active:not(:disabled) { transform: scale(0.94); }
  .scw-ai-input-row button svg { width: 15px; height: 15px; }

  /* ================================================================
     HUMAN VIEW (pre-chat form + live thread) — unchanged from v1
     ================================================================ */

  .scw-welcome { color: var(--scw-text-2); font-size: 13px; line-height: 1.65; margin-bottom: 20px; }
  .scw-logged-badge {
    display: flex; align-items: center; gap: 6px;
    color: var(--scw-success); font-size: 12px; font-weight: 600;
    background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25);
    border-radius: 10px; padding: 8px 12px; margin-bottom: 20px;
  }

  .scw-field { display: block; margin-bottom: 16px; }
  .scw-field span {
    display: block; font-size: 10.5px; color: var(--scw-text-2); margin-bottom: 7px;
    text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
  }
  .scw-field input, .scw-field select, .scw-field textarea {
    width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.045);
    border: 1px solid var(--scw-border); border-radius: 10px; padding: 11px 13px;
    color: var(--scw-text); font-family: inherit; font-size: 13.5px; outline: none;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }
  .scw-field input::placeholder, .scw-field textarea::placeholder { color: rgba(255,255,255,0.32); }
  .scw-field input:hover, .scw-field select:hover, .scw-field textarea:hover { border-color: rgba(255,255,255,0.18); }
  .scw-field input:focus, .scw-field select:focus, .scw-field textarea:focus {
    border-color: var(--scw-accent); background: rgba(139,92,246,0.06);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
  }
  .scw-field textarea { resize: vertical; min-height: 72px; line-height: 1.5; overscroll-behavior: contain; }
  .scw-field select {
    cursor: pointer; appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
    background-repeat: no-repeat; background-position: right 12px center; background-size: 15px;
    padding-right: 34px;
  }
  .scw-field select option { background: var(--scw-card); color: var(--scw-text); }

  .scw-start-btn {
    width: 100%; margin-top: 6px; padding: 13px; border: none; border-radius: 11px;
    background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2)); color: #fff;
    font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
    box-shadow: 0 6px 18px rgba(139,92,246,0.35);
    transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease, opacity 0.2s ease;
  }
  .scw-start-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(139,92,246,0.45); }
  .scw-start-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .scw-start-btn:disabled { opacity: 0.65; cursor: default; }
  .scw-form-error { color: var(--scw-danger); font-size: 11.5px; margin-top: 10px; min-height: 14px; line-height: 1.4; }

  /* ---------- Messages ---------- */
  .scw-messages { display: flex; flex-direction: column; gap: 14px; }
  .scw-msg {
    max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.5;
    animation: scw-msg-in 0.3s cubic-bezier(.2,1,.3,1);
  }
  @keyframes scw-msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .scw-msg-bot, .scw-msg-admin {
    align-self: flex-start; background: var(--scw-card-2); border: 1px solid var(--scw-border);
    color: rgba(255,255,255,0.92); border-bottom-left-radius: 4px;
  }
  .scw-msg-visitor {
    align-self: flex-end; background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2));
    color: #fff; border-bottom-right-radius: 4px;
  }
  .scw-msg-label { display: block; font-size: 10px; opacity: 0.6; margin-bottom: 3px; font-weight: 600; letter-spacing: 0.02em; }

  /* ---------- Resolve prompt (Yes/No) buttons ---------- */
  .scw-msg-actions { display: flex; gap: 8px; margin-top: 10px; }
  .scw-msg-actions button {
    flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--scw-border);
    background: rgba(255,255,255,0.05); color: var(--scw-text); font-family: inherit;
    font-size: 12.5px; font-weight: 700; cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  }
  .scw-msg-actions button:hover:not(:disabled) { background: rgba(139,92,246,0.18); border-color: var(--scw-accent); }
  .scw-msg-actions button:active:not(:disabled) { transform: scale(0.97); }
  .scw-msg-actions button:disabled { opacity: 0.45; cursor: default; }
  .scw-msg-actions .scw-btn-yes { border-color: rgba(139,92,246,0.45); }

  /* ---------- Human input row ---------- */
  .scw-input-row { display: none; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--scw-border); flex-shrink: 0; background: var(--scw-card-2); }
  .scw-input-row input {
    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--scw-border);
    border-radius: 22px; padding: 11px 16px; color: var(--scw-text); font-family: inherit; font-size: 13.5px; outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .scw-input-row input::placeholder { color: rgba(255,255,255,0.32); }
  .scw-input-row input:focus { border-color: var(--scw-accent); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
  .scw-input-row button {
    width: 38px; height: 38px; border-radius: 50%; border: none; flex-shrink: 0;
    background: linear-gradient(135deg, var(--scw-accent), var(--scw-accent-2)); color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.18s cubic-bezier(.34,1.56,.64,1);
  }
  .scw-input-row button:hover { transform: scale(1.08); }
  .scw-input-row button:active { transform: scale(0.94); }
  .scw-input-row button svg { width: 15px; height: 15px; }

  /* ---------- Footer ---------- */
  .scw-footer { text-align: center; padding: 12px 20px; font-size: 10.5px; color: var(--scw-text-2); border-top: 1px solid var(--scw-border); flex-shrink: 0; }
  .scw-footer strong { color: rgba(255,255,255,0.65); }

  @media (prefers-reduced-motion: reduce) {
    .scw-panel, .scw-bubble, .scw-toggle, .scw-toggle svg, .scw-msg, .scw-start-btn, .scw-header-close,
    .scw-input-row button, .scw-ai-hero, .scw-qcard, .scw-ai-row, .scw-ai-typing span, .scw-avatar svg {
      transition: none !important; animation: none !important;
    }
  }

  @media (max-width: 480px) {
    #scw-root { bottom: 16px; right: 16px; }
    .scw-panel { bottom: 16px; right: 8px; width: calc(100vw - 16px); height: 78vh; max-height: 640px; }
    .scw-bubble { right: -6px; max-width: 190px; }
    .scw-card-grid { grid-template-columns: 1fr; }
  }
  `;

  /* ================================================================
     3. MARKUP
     ================================================================ */

  const html = `
  <div id="scw-root" class="scw-mode-ai">
    <div class="scw-bubble" id="scw-bubble">👋 Kono kichu jantey chan?</div>

    <div class="scw-panel">
      <div class="scw-header">
        <div class="scw-header-left">
          <div class="scw-avatar">
            <svg class="scw-avatar-icon-human" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <svg class="scw-avatar-icon-ai" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.9 5.8L20 9.5l-5.8 1.9L12 17l-1.9-5.6L4 9.5l6.1-1.7L12 2z"/></svg>
          </div>
          <div class="scw-header-text">
            <div class="scw-header-title-row">
              <span class="scw-status-dot" id="scw-status-dot"></span>
              <span class="scw-header-title" id="scw-header-title">Scriptora AI</span>
            </div>
            <div class="scw-header-status" id="scw-status-text">Academic Assistant · Online</div>
          </div>
        </div>
        <button class="scw-header-close" id="scw-close-btn" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      <div class="scw-mode-tabs" id="scw-mode-tabs">
        <button type="button" class="scw-mode-tab scw-tab-active" id="scw-tab-ai" data-mode="ai">✨ AI Assistant</button>
        <button type="button" class="scw-mode-tab" id="scw-tab-human" data-mode="human">💬 Live Chat<span class="scw-tab-dot"></span></button>
      </div>

      <div class="scw-body" id="scw-body">

        <!-- ===== AI VIEW ===== -->
        <div id="scw-ai-view" class="scw-ai-view">
          <div class="scw-ai-hero" id="scw-ai-hero">
            <div>
              <div class="scw-ai-headline">Your academic project,<br>planned in minutes.</div>
              <div class="scw-ai-sub">Ask about pricing, timelines, or samples — or start your order right here.</div>
            </div>
            <div class="scw-proof-strip">
              <span><b>500+</b>&nbsp;delivered</span><span>·</span>
              <span><b>12 min</b>&nbsp;avg reply</span><span>·</span>
              <span><b>Verified</b>&nbsp;writers</span>
            </div>
            <div class="scw-card-grid">
              <button type="button" class="scw-qcard" data-ai-action="consultation">
                <span class="scw-qcard-icon">◆</span>
                <span class="scw-qcard-title">Get thesis consultation</span>
                <span class="scw-qcard-desc">Talk through your topic and timeline.</span>
              </button>
              <button type="button" class="scw-qcard" data-ai-action="estimate">
                <span class="scw-qcard-icon">◇</span>
                <span class="scw-qcard-title">Estimate thesis cost</span>
                <span class="scw-qcard-desc">Get a real number in seconds.</span>
              </button>
              <button type="button" class="scw-qcard" data-ai-action="samples">
                <span class="scw-qcard-icon">◈</span>
                <span class="scw-qcard-title">View real samples</span>
                <span class="scw-qcard-desc">See actual delivered work.</span>
              </button>
              <button type="button" class="scw-qcard" data-ai-action="compare">
                <span class="scw-qcard-icon">◉</span>
                <span class="scw-qcard-title">Compare packages</span>
                <span class="scw-qcard-desc">Standard, recommended, premium.</span>
              </button>
              <button type="button" class="scw-qcard scw-qcard-primary" data-ai-action="start-order">
                <span class="scw-qcard-icon">►</span>
                <span class="scw-qcard-title">Start my order</span>
                <span class="scw-qcard-desc">Already know what you need?</span>
              </button>
              <button type="button" class="scw-qcard" data-ai-action="handoff">
                <span class="scw-qcard-icon">◐</span>
                <span class="scw-qcard-title">Talk to an expert</span>
                <span class="scw-qcard-desc">Reach a real person now.</span>
              </button>
            </div>
            <div class="scw-pills" id="scw-topics">
              <button type="button" class="scw-pill scw-pill-active" data-topic="honours">Honours thesis</button>
              <button type="button" class="scw-pill" data-topic="masters">Masters thesis</button>
              <button type="button" class="scw-pill" data-topic="proposal">Proposal</button>
              <button type="button" class="scw-pill" data-topic="spss">SPSS</button>
              <button type="button" class="scw-pill" data-topic="turnitin">Turnitin</button>
              <button type="button" class="scw-pill" data-topic="faq">FAQ</button>
            </div>
          </div>
          <div class="scw-ai-thread" id="scw-ai-thread"></div>
        </div>

        <!-- ===== HUMAN VIEW (unchanged) ===== -->
        <div id="scw-form-view">
          <p class="scw-welcome">Welcome to Scriptora Live Chat! Message পাঠানোর আগে নিচের form-টা fill করুন।</p>
          <div class="scw-logged-badge" id="scw-logged-badge" style="display:none">✓ Logged in as <span id="scw-logged-name"></span></div>

          <label class="scw-field">
            <span>Your Name</span>
            <input type="text" id="scw-name" placeholder="আপনার নাম" />
          </label>
          <label class="scw-field">
            <span>Your Email</span>
            <input type="email" id="scw-email" placeholder="আপনার ইমেইল" />
          </label>
          <label class="scw-field" id="scw-phone-field">
            <span>Mobile Number</span>
            <input type="tel" id="scw-phone" placeholder="আপনার মোবাইল নম্বর (e.g. 017XXXXXXXX)" />
          </label>
          <label class="scw-field">
            <span>Chat Department</span>
            <select id="scw-department">
              <option value="" disabled selected>Choose department</option>
              <option>Thesis Writing</option>
              <option>Assignment Help</option>
              <option>Order &amp; Payment</option>
              <option>General Inquiry</option>
            </select>
          </label>
          <label class="scw-field">
            <span>Your Message</span>
            <textarea id="scw-message" placeholder="আমরা কীভাবে সাহায্য করতে পারি?"></textarea>
          </label>

          <button class="scw-start-btn" id="scw-start-btn">Start The Chat</button>
          <div class="scw-form-error" id="scw-form-error"></div>
        </div>

        <div class="scw-messages" id="scw-messages" style="display:none"></div>
      </div>

      <!-- AI input row -->
      <div class="scw-ai-input-row" id="scw-ai-input-row">
        <input type="text" id="scw-ai-input" placeholder="Ask about pricing, samples, or your order..." />
        <button id="scw-ai-send-btn" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      <!-- Human input row (unchanged) -->
      <div class="scw-input-row" id="scw-input-row">
        <input type="text" id="scw-chat-input" placeholder="Type a message..." />
        <button id="scw-send-btn" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      <div class="scw-footer">Powered by <strong>Scriptora</strong></div>
    </div>

    <button class="scw-toggle" id="scw-toggle-btn" aria-label="Open chat">
      <svg class="scw-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <svg class="scw-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>`;

  /* ================================================================
     4. BOOTSTRAP
     ================================================================ */

  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  function inject() {
    document.body.insertAdjacentHTML('beforeend', html);
    initWidget();
  }
  if (document.readyState !== 'loading') inject();
  else document.addEventListener('DOMContentLoaded', inject);

  /* ================================================================
     5. WIDGET INIT
     ================================================================ */

  function initWidget() {

    /* ---- shared DOM refs ---- */
    const root          = document.getElementById('scw-root');
    const toggleBtn      = document.getElementById('scw-toggle-btn');
    const closeBtn        = document.getElementById('scw-close-btn');
    const bubble           = document.getElementById('scw-bubble');
    const statusDot         = document.getElementById('scw-status-dot');
    const statusText        = document.getElementById('scw-status-text');
    const headerTitleEl      = document.getElementById('scw-header-title');
    const tabAi               = document.getElementById('scw-tab-ai');
    const tabHuman             = document.getElementById('scw-tab-human');

    /* ---- AI view refs ---- */
    const aiView          = document.getElementById('scw-ai-view');
    const aiHero           = document.getElementById('scw-ai-hero');
    const aiThread          = document.getElementById('scw-ai-thread');
    const aiTopics           = document.getElementById('scw-topics');
    const aiInputRow          = document.getElementById('scw-ai-input-row');
    const aiInput              = document.getElementById('scw-ai-input');
    const aiSendBtn              = document.getElementById('scw-ai-send-btn');

    /* ---- Human view refs (unchanged) ---- */
    const formView          = document.getElementById('scw-form-view');
    const messagesEl        = document.getElementById('scw-messages');
    const inputRow           = document.getElementById('scw-input-row');
    const nameInput          = document.getElementById('scw-name');
    const emailInput         = document.getElementById('scw-email');
    const phoneInput         = document.getElementById('scw-phone');
    const phoneField         = document.getElementById('scw-phone-field');
    const deptSelect         = document.getElementById('scw-department');
    const msgTextarea        = document.getElementById('scw-message');
    const startBtn           = document.getElementById('scw-start-btn');
    const formError          = document.getElementById('scw-form-error');
    const chatInput          = document.getElementById('scw-chat-input');
    const sendBtn             = document.getElementById('scw-send-btn');
    const loggedBadge        = document.getElementById('scw-logged-badge');
    const loggedNameEl       = document.getElementById('scw-logged-name');

    let leadId = sessionStorage.getItem('scw_lead_id') || null;
    let realtimeChannel = null;
    let hasStartedHumanChat = !!leadId;
    let currentMode = 'ai';
    const clientId = localStorage.getItem('scriptora_client_id') || null;
    const isRegistered = !!clientId;

    /* Human-mode status text is precomputed once (used when switching
       back into human mode) so we don't recompute business hours twice. */
    const online = isOnlineNow();
    const humanStatusText = online
      ? 'Online — সাধারণত কয়েক মিনিটে reply দিই'
      : 'Offline — message রেখে দিন, আমরা reply করবো';
    statusDot.classList.toggle('scw-offline', !online);

    /* Prefill logged-in user info */
    const savedName  = localStorage.getItem('scriptora_name')  || '';
    const savedEmail = localStorage.getItem('scriptora_email') || '';
    if (savedName || savedEmail) {
      nameInput.value  = savedName;
      emailInput.value = savedEmail;
      if (savedName) {
        loggedBadge.style.display = 'flex';
        loggedNameEl.textContent = savedName;
      }
    }

    if (isRegistered) {
      phoneField.style.display = 'none';
    } else {
      const savedPhone = localStorage.getItem('scriptora_guest_phone') || '';
      if (savedPhone) phoneInput.value = savedPhone;
    }

    /* Stop scroll from chaining to the page behind the widget */
    const scwBody = document.getElementById('scw-body');
    scwBody.addEventListener('wheel', (e) => {
      const atTop    = scwBody.scrollTop <= 0;
      const atBottom = scwBody.scrollTop + scwBody.clientHeight >= scwBody.scrollHeight - 1;
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) e.preventDefault();
    }, { passive: false });

    /* ============================================================
       5a. SHARED SHELL — open/close, greeting bubble
       ============================================================ */

    toggleBtn.addEventListener('click', () => {
      root.classList.toggle('scw-open');
      bubble.classList.remove('scw-show');
    });
    closeBtn.addEventListener('click', () => root.classList.remove('scw-open'));
    bubble.addEventListener('click', () => {
      root.classList.add('scw-open');
      bubble.classList.remove('scw-show');
    });

    setTimeout(() => {
      if (!root.classList.contains('scw-open')) bubble.classList.add('scw-show');
    }, 4000);
    setTimeout(() => bubble.classList.remove('scw-show'), 12000);

    function getSB() {
      return window.scriptoraSupabase || null;
    }

    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }

    /* ============================================================
       5b. AI ASSISTANT MODULE
       ============================================================ */

    let aiConversationStarted = false;
    let aiBusy = false;

    function collapseAiHeroIfNeeded() {
      if (aiConversationStarted) return;
      aiConversationStarted = true;
      aiHero.classList.add('scw-collapsed');
    }

    function scrollAiToLatest() {
      requestAnimationFrame(() => { scwBody.scrollTop = scwBody.scrollHeight; });
    }

    function renderAiEstimateCard() {
      return (
        '<div class="scw-ai-estimate">' +
        '<div class="scw-ai-estimate-row"><span>Service</span><b>Thesis writing</b></div>' +
        '<div class="scw-ai-estimate-row"><span>Academic level</span><b>Masters</b></div>' +
        '<div class="scw-ai-estimate-row"><span>Length</span><b>15,000 words</b></div>' +
        '<div class="scw-ai-estimate-total"><span style="font-size:11px;color:var(--scw-text-2);">Estimated total</span><span class="scw-ai-estimate-price">৳42,000</span></div>' +
        '</div>'
      );
    }

    function appendAiUserBubble(text) {
      collapseAiHeroIfNeeded();
      const row = document.createElement('div');
      row.className = 'scw-ai-row scw-ai-row-user';
      row.innerHTML = '<div class="scw-ai-bubble scw-ai-bubble-user"></div>';
      row.querySelector('.scw-ai-bubble').textContent = text;
      aiThread.appendChild(row);
      scrollAiToLatest();
    }

    function appendAiBotBubble(responseKey) {
      const response = AI_RESPONSES[responseKey] || AI_RESPONSES['default'];
      const row = document.createElement('div');
      row.className = 'scw-ai-row';
      let inner = '<div class="scw-ai-avatar-sm"></div><div class="scw-ai-bubble scw-ai-bubble-bot">' + escapeHtml(response.text);
      if (response.card === 'estimate') inner += renderAiEstimateCard();
      inner += '</div>';
      row.innerHTML = inner;
      aiThread.appendChild(row);
      scrollAiToLatest();
    }

    function setAiInputEnabled(enabled) {
      aiInput.disabled = !enabled;
      updateAiSendState();
    }

    function updateAiSendState() {
      aiSendBtn.disabled = aiInput.disabled || aiInput.value.trim().length === 0;
    }

    /* Simulated typing + reply. Replace the inside of the setTimeout with
       a real request (e.g. fetch to a Supabase edge function or AI API)
       when a live backend is ready — appendAiBotBubble() stays the same. */
    function respondAi(responseKey) {
      aiBusy = true;
      setAiInputEnabled(false);

      const typingRow = document.createElement('div');
      typingRow.className = 'scw-ai-row';
      typingRow.innerHTML = '<div class="scw-ai-avatar-sm"></div><div class="scw-ai-bubble scw-ai-bubble-bot"><div class="scw-ai-typing"><span></span><span></span><span></span></div></div>';
      aiThread.appendChild(typingRow);
      scrollAiToLatest();

      window.setTimeout(() => {
        typingRow.remove();
        appendAiBotBubble(responseKey);
        aiBusy = false;
        setAiInputEnabled(true);
      }, 900);
    }

    function handleQuickAction(actionKey) {
      const cardTitleEl = aiView.querySelector('[data-ai-action="' + actionKey + '"] .scw-qcard-title');
      const label = cardTitleEl ? cardTitleEl.textContent : 'Tell me more';

      /* "Start my order" / "Talk to an expert" hand off to the real
         Supabase-backed human flow — that's the only place an actual
         order or a human is reached today. */
      if (AI_HANDOFF_ACTIONS[actionKey]) {
        switchMode('human');
        if (actionKey === 'start-order' && !msgTextarea.value) {
          msgTextarea.value = "I'd like to start my order.";
        } else if (actionKey === 'handoff' && !msgTextarea.value) {
          msgTextarea.value = 'Could I speak with someone directly, please?';
        }
        return;
      }

      appendAiUserBubble(label);
      respondAi(actionKey);
    }

    function handleTopicSelect(topicKey, pillEl) {
      aiTopics.querySelectorAll('.scw-pill').forEach((p) => p.classList.remove('scw-pill-active'));
      pillEl.classList.add('scw-pill-active');
      const prompt = TOPIC_PROMPTS[topicKey];
      if (!prompt) return;
      appendAiUserBubble(prompt);
      respondAi('default');
    }

    aiView.addEventListener('click', (evt) => {
      const actionBtn = evt.target.closest('[data-ai-action]');
      if (actionBtn) { handleQuickAction(actionBtn.getAttribute('data-ai-action')); return; }
      const topicBtn = evt.target.closest('[data-topic]');
      if (topicBtn) handleTopicSelect(topicBtn.getAttribute('data-topic'), topicBtn);
    });

    function sendAiMessage() {
      if (aiBusy) return;
      const text = aiInput.value.trim();
      if (!text) return;
      appendAiUserBubble(text);
      aiInput.value = '';
      updateAiSendState();
      respondAi('default');
    }

    aiInput.addEventListener('input', updateAiSendState);
    aiInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAiMessage(); });
    aiSendBtn.addEventListener('click', sendAiMessage);

    /* ============================================================
       5c. HUMAN LIVE CHAT MODULE — preserved from v1, unchanged
       ============================================================ */

    function showChatView() {
      formView.style.display = 'none';
      messagesEl.style.display = 'flex';
      inputRow.style.display = 'flex';
    }

    function appendMsg(msg, opts = {}) {
      const sender = msg.sender;
      const label = sender === 'visitor' ? 'You' : sender === 'admin' ? 'Scriptora Team' : 'Scriptora Bot';
      const div = document.createElement('div');
      div.className = 'scw-msg scw-msg-' + sender;
      div.innerHTML = '<span class="scw-msg-label">' + label + '</span>' + escapeHtml(msg.message || '');

      if (msg.message_type === 'resolve_prompt' && !opts.answered) {
        const actions = document.createElement('div');
        actions.className = 'scw-msg-actions';
        actions.innerHTML =
          '<button class="scw-btn-yes" data-answer="yes">Yes, I need help</button>' +
          '<button class="scw-btn-no" data-answer="no">No, I\'m all set</button>';
        actions.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => handleResolveAnswer(msg.id, btn.dataset.answer === 'yes', actions));
        });
        div.appendChild(actions);
      }

      messagesEl.appendChild(div);
      document.getElementById('scw-body').scrollTop = document.getElementById('scw-body').scrollHeight;
    }

    async function handleResolveAnswer(promptMsgId, needsHelp, actionsEl) {
      actionsEl.querySelectorAll('button').forEach(b => b.disabled = true);

      const replyText = needsHelp ? 'Yes, I still need help.' : "No, I'm all set. Thank you!";
      appendMsg({ sender: 'visitor', message: replyText, message_type: 'text' });

      const sb = getSB();
      if (!sb || !leadId) return;

      await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'visitor', message: replyText });
      await sb.from('website_chat_leads').update({ status: needsHelp ? 'open' : 'closed' }).eq('id', leadId);

      if (!needsHelp) {
        const closingMsg = 'Thanks for contacting us! Feel free to reach out again if you need anything.';
        await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'bot', message: closingMsg });
      }
    }

    async function loadExistingMessages() {
      const sb = getSB();
      if (!sb || !leadId) return;
      const { data } = await sb.from('website_chat_messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true });
      if (data) data.forEach((m, i) => {
        const answered = m.message_type === 'resolve_prompt' && data.slice(i + 1).some(x => x.sender === 'visitor');
        appendMsg(m, { answered });
      });
    }

    function markHumanTabUnread() {
      if (currentMode !== 'human') tabHuman.classList.add('scw-tab-unread');
    }

    function subscribeRealtime() {
      const sb = getSB();
      if (!sb || !leadId || realtimeChannel) return;
      realtimeChannel = sb.channel('scw-lead-' + leadId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_messages', filter: `lead_id=eq.${leadId}` }, (payload) => {
          if (payload.new.sender === 'admin' || payload.new.sender === 'bot') {
            appendMsg(payload.new);
            if (payload.new.sender === 'admin') markHumanTabUnread();
          }
        })
        .subscribe();
    }

    startBtn.addEventListener('click', async () => {
      const name    = nameInput.value.trim();
      const email   = emailInput.value.trim();
      const phone   = phoneInput.value.trim();
      const dept    = deptSelect.value;
      const message = msgTextarea.value.trim();

      if (!name || !email || !dept || !message) {
        formError.textContent = 'সব field fill করুন।';
        return;
      }
      if (!isRegistered && !phone) {
        formError.textContent = 'অনুগ্রহ করে আপনার মোবাইল নম্বর দিন।';
        return;
      }
      if (!isRegistered && !/^[+]?[\d\s-]{7,15}$/.test(phone)) {
        formError.textContent = 'সঠিক মোবাইল নম্বর দিন।';
        return;
      }
      formError.textContent = '';
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';

      const sb = getSB();
      if (!sb) console.warn('[Scriptora ChatWidget] window.scriptoraSupabase পাওয়া যায়নি — এই page-এ supabase-js CDN + shared/supabaseClient.js লোড হয়েছে কিনা check করুন। Widget local-only mode-এ চলবে (কিছু save হবে না)।');

      if (!isRegistered && phone) localStorage.setItem('scriptora_guest_phone', phone);

      if (sb) {
        const { data: lead, error } = await sb.from('website_chat_leads').insert({
          name, email, phone: phone || null, department: dept, client_id: clientId, page_source: pageSource, status: 'open',
        }).select().single();

        if (error) {
          console.error('[Scriptora ChatWidget] lead insert failed:', error);
          formError.textContent = 'Message পাঠানো যায়নি: ' + (error.message || 'Unknown error') + ' (console-এ details আছে)';
          startBtn.disabled = false;
          startBtn.textContent = 'Start The Chat';
          return;
        }

        leadId = lead.id;
        sessionStorage.setItem('scw_lead_id', leadId);

        await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'visitor', message });
        const botReply = (DEPT_REPLIES[dept] || DEPT_REPLIES['General Inquiry']) + (online ? '' : ' (বর্তমানে আমরা অফিস সময়ের বাইরে আছি — কাজের সময় সকাল ১০টা–রাত ১০টা)');
        await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'bot', message: botReply });

        subscribeRealtime();
      }

      hasStartedHumanChat = true;
      showChatView();
      appendMsg({ sender: 'visitor', message: message, message_type: 'text' });
      const fallbackReply = (DEPT_REPLIES[dept] || DEPT_REPLIES['General Inquiry']) + (online ? '' : ' (বর্তমানে আমরা অফিস সময়ের বাইরে আছি — কাজের সময় সকাল ১০টা–রাত ১০টা)');
      appendMsg({ sender: 'bot', message: fallbackReply, message_type: 'text' });

      startBtn.disabled = false;
      startBtn.textContent = 'Start The Chat';
    });

    async function sendFollowUp() {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      appendMsg({ sender: 'visitor', message: text, message_type: 'text' });

      const sb = getSB();
      if (sb && leadId) {
        const { error } = await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'visitor', message: text });
        if (error) console.error('[Scriptora ChatWidget] message insert failed:', error);

        const { error: reopenErr } = await sb.from('website_chat_leads').update({ status: 'open' }).eq('id', leadId);
        if (reopenErr) console.error('[Scriptora ChatWidget] auto-reopen failed:', reopenErr);
      }
    }
    sendBtn.addEventListener('click', sendFollowUp);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFollowUp(); });

    /* ============================================================
       5d. MODE SWITCHER
       ============================================================ */

    function switchMode(mode) {
      currentMode = mode;
      root.classList.toggle('scw-mode-ai', mode === 'ai');
      tabAi.classList.toggle('scw-tab-active', mode === 'ai');
      tabHuman.classList.toggle('scw-tab-active', mode === 'human');

      if (mode === 'human') tabHuman.classList.remove('scw-tab-unread');

      if (mode === 'ai') {
        aiView.style.display = 'flex';
        formView.style.display = 'none';
        messagesEl.style.display = 'none';
        aiInputRow.style.display = 'flex';
        inputRow.style.display = 'none';
        headerTitleEl.textContent = 'Scriptora AI';
        statusText.textContent = 'Academic Assistant · Online';
        statusDot.classList.remove('scw-offline');
      } else {
        aiView.style.display = 'none';
        aiInputRow.style.display = 'none';
        if (hasStartedHumanChat) {
          showChatView();
        } else {
          formView.style.display = '';
          messagesEl.style.display = 'none';
          inputRow.style.display = 'none';
        }
        headerTitleEl.textContent = 'Scriptora Support';
        statusText.textContent = humanStatusText;
        statusDot.classList.toggle('scw-offline', !online);
      }
    }

    tabAi.addEventListener('click', () => switchMode('ai'));
    tabHuman.addEventListener('click', () => switchMode('human'));

    /* ---- initial mode: resume an in-progress human chat if one exists
       in this tab already; otherwise land on the new AI experience. ---- */
    if (leadId) {
      loadExistingMessages();
      subscribeRealtime();
      switchMode('human');
    } else {
      switchMode('ai');
    }
  }

})();
