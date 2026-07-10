/* ================================================================
   SCRIPTORA — shared/chatWidget.js
   Live Chat Widget (pre-chat form + message thread)

   Usage: <script src="../shared/chatWidget.js"></script>
   (এই script tag-এর আগে অবশ্যই supabase-js CDN +
    ../shared/supabaseClient.js load করা থাকতে হবে,
    না হলে widget local-only mode-এ চলবে — lead/message
    Supabase-এ save হবে না, শুধু UI কাজ করবে।)

   DB tables লাগবে (shared/chat-widget-schema.sql দেখুন):
     - website_chat_leads
     - website_chat_messages
   ================================================================ */

(function () {

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

  /* ── CSS ── */
  const css = `
  #scw-root { position: fixed; bottom: 22px; right: 22px; z-index: 9999; font-family: 'Inter', system-ui, sans-serif; }

  .scw-toggle {
    width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
    background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    box-shadow: 0 8px 24px rgba(124,58,237,0.45);
    display: flex; align-items: center; justify-content: center;
    color: #fff; transition: transform 0.2s;
  }
  .scw-toggle:hover { transform: scale(1.06); }
  .scw-toggle svg { width: 26px; height: 26px; }
  .scw-toggle .scw-icon-close { display: none; }
  #scw-root.scw-open .scw-toggle .scw-icon-chat  { display: none; }
  #scw-root.scw-open .scw-toggle .scw-icon-close { display: block; }

  .scw-bubble {
    position: absolute; bottom: 70px; right: 0;
    background: #12172b; border: 1px solid rgba(255,255,255,0.1);
    color: #fff; padding: 10px 14px; border-radius: 12px 12px 4px 12px;
    font-size: 13px; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,0.35);
    opacity: 0; transform: translateY(6px); pointer-events: none;
    transition: opacity 0.3s, transform 0.3s;
  }
  .scw-bubble.scw-show { opacity: 1; transform: translateY(0); pointer-events: auto; cursor: pointer; }

  .scw-panel {
    position: fixed; bottom: 90px; right: 16px;
    width: 380px; max-width: calc(100vw - 32px);
    height: 50vh; max-height: 500px; min-height: 380px;
    background: #0b0f1e; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px; overflow: hidden;
    box-shadow: 0 24px 70px rgba(0,0,0,0.55);
    display: flex; flex-direction: column;
    transform: translateX(24px) scale(0.97);
    opacity: 0; visibility: hidden; pointer-events: none;
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease, visibility 0s linear 0.4s;
    z-index: 9998;
  }
  #scw-root.scw-open .scw-panel {
    transform: translateX(0) scale(1);
    opacity: 1; visibility: visible; pointer-events: auto;
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.32s ease, visibility 0s linear 0s;
  }

  .scw-header {
    background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .scw-header-left { display: flex; align-items: center; gap: 10px; }
  .scw-status-dot { width: 9px; height: 9px; border-radius: 50%; background: #4ADE80; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(74,222,128,0.25); }
  .scw-status-dot.scw-offline { background: #F87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.25); }
  .scw-header-title { color: #fff; font-size: 14.5px; font-weight: 700; }
  .scw-header-status { color: rgba(255,255,255,0.85); font-size: 11.5px; margin-top: 1px; }
  .scw-header-close { background: rgba(255,255,255,0.12); border: none; color: #fff; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0; transition: background 0.2s, transform 0.2s; }
  .scw-header-close:hover { background: rgba(255,255,255,0.22); transform: scale(1.08); }
  .scw-header-close svg { width: 14px; height: 14px; }

  .scw-body { flex: 1; overflow-y: auto; padding: 16px; }
  .scw-body::-webkit-scrollbar { width: 5px; }
  .scw-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }

  .scw-welcome { color: rgba(255,255,255,0.75); font-size: 12.5px; line-height: 1.55; margin-bottom: 12px; }
  .scw-logged-badge { color: #4ADE80; font-size: 12px; font-weight: 600; margin-bottom: 12px; }

  .scw-field { display: block; margin-bottom: 10px; }
  .scw-field span { display: block; font-size: 10.5px; color: rgba(255,255,255,0.45); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  .scw-field input, .scw-field select, .scw-field textarea {
    width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 9px 10px;
    color: #fff; font-family: inherit; font-size: 13px; outline: none;
    transition: border-color 0.2s;
  }
  .scw-field input:focus, .scw-field select:focus, .scw-field textarea:focus { border-color: #8B5CF6; }
  .scw-field textarea { resize: vertical; min-height: 60px; }
  .scw-field select { cursor: pointer; }
  .scw-field select option { background: #12172b; }

  .scw-start-btn {
    width: 100%; margin-top: 4px; padding: 11px; border: none; border-radius: 9px;
    background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: #fff;
    font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
    transition: opacity 0.2s;
  }
  .scw-start-btn:hover { opacity: 0.9; }
  .scw-form-error { color: #F87171; font-size: 11.5px; margin-top: 8px; min-height: 14px; }

  .scw-messages { display: flex; flex-direction: column; gap: 10px; }
  .scw-msg { max-width: 82%; padding: 9px 12px; border-radius: 12px; font-size: 13px; line-height: 1.45; }
  .scw-msg-bot, .scw-msg-admin { align-self: flex-start; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); border-bottom-left-radius: 3px; }
  .scw-msg-visitor { align-self: flex-end; background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: #fff; border-bottom-right-radius: 3px; }
  .scw-msg-label { display: block; font-size: 10px; opacity: 0.6; margin-bottom: 2px; }

  .scw-input-row { display: none; gap: 8px; padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
  .scw-input-row input {
    flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px; padding: 9px 14px; color: #fff; font-family: inherit; font-size: 13px; outline: none;
  }
  .scw-input-row input:focus { border-color: #8B5CF6; }
  .scw-input-row button {
    width: 36px; height: 36px; border-radius: 50%; border: none; flex-shrink: 0;
    background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .scw-input-row button svg { width: 15px; height: 15px; }

  .scw-footer { text-align: center; padding: 8px; font-size: 10.5px; color: rgba(255,255,255,0.35); border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
  .scw-footer strong { color: rgba(255,255,255,0.6); }

  @media (max-width: 480px) {
    #scw-root { bottom: 14px; right: 14px; }
    .scw-panel { bottom: 80px; right: 10px; width: calc(100vw - 20px); height: 60vh; max-height: 520px; }
  }
  `;

  /* ── HTML ── */
  const html = `
  <div id="scw-root">
    <div class="scw-bubble" id="scw-bubble">👋 Kono kichu jantey chan?</div>

    <div class="scw-panel">
      <div class="scw-header">
        <div class="scw-header-left">
          <span class="scw-status-dot" id="scw-status-dot"></span>
          <div>
            <div class="scw-header-title">Scriptora Support</div>
            <div class="scw-header-status" id="scw-status-text">Online</div>
          </div>
        </div>
        <button class="scw-header-close" id="scw-close-btn" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      <div class="scw-body" id="scw-body">
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

  /* ── Inject CSS ── */
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  /* ── Inject HTML ── */
  function inject() {
    document.body.insertAdjacentHTML('beforeend', html);
    initWidget();
  }
  if (document.readyState !== 'loading') inject();
  else document.addEventListener('DOMContentLoaded', inject);

  /* ── Widget logic ── */
  function initWidget() {
    const root         = document.getElementById('scw-root');
    const toggleBtn     = document.getElementById('scw-toggle-btn');
    const closeBtn       = document.getElementById('scw-close-btn');
    const bubble          = document.getElementById('scw-bubble');
    const statusDot        = document.getElementById('scw-status-dot');
    const statusText       = document.getElementById('scw-status-text');
    const formView          = document.getElementById('scw-form-view');
    const messagesEl        = document.getElementById('scw-messages');
    const inputRow           = document.getElementById('scw-input-row');
    const nameInput          = document.getElementById('scw-name');
    const emailInput         = document.getElementById('scw-email');
    const deptSelect         = document.getElementById('scw-department');
    const msgTextarea        = document.getElementById('scw-message');
    const startBtn           = document.getElementById('scw-start-btn');
    const formError          = document.getElementById('scw-form-error');
    const chatInput          = document.getElementById('scw-chat-input');
    const sendBtn            = document.getElementById('scw-send-btn');
    const loggedBadge        = document.getElementById('scw-logged-badge');
    const loggedNameEl       = document.getElementById('scw-logged-name');

    let leadId = sessionStorage.getItem('scw_lead_id') || null;
    let realtimeChannel = null;

    /* Online/offline status */
    const online = isOnlineNow();
    statusDot.classList.toggle('scw-offline', !online);
    statusText.textContent = online ? 'Online — সাধারণত কয়েক মিনিটে reply দিই' : 'Offline — message রেখে দিন, আমরা reply করবো';

    /* Prefill logged-in user info */
    const savedName  = localStorage.getItem('scriptora_name')  || '';
    const savedEmail = localStorage.getItem('scriptora_email') || '';
    if (savedName || savedEmail) {
      nameInput.value  = savedName;
      emailInput.value = savedEmail;
      if (savedName) {
        loggedBadge.style.display = 'block';
        loggedNameEl.textContent = savedName;
      }
    }

    /* Toggle open/close */
    toggleBtn.addEventListener('click', () => {
      root.classList.toggle('scw-open');
      bubble.classList.remove('scw-show');
    });
    closeBtn.addEventListener('click', () => root.classList.remove('scw-open'));
    bubble.addEventListener('click', () => {
      root.classList.add('scw-open');
      bubble.classList.remove('scw-show');
    });

    /* Greeting bubble, once, after a short delay */
    setTimeout(() => {
      if (!root.classList.contains('scw-open')) bubble.classList.add('scw-show');
    }, 4000);
    setTimeout(() => bubble.classList.remove('scw-show'), 12000);

    /* If a chat session already exists this tab, resume chat view */
    if (leadId) {
      showChatView();
      loadExistingMessages();
      subscribeRealtime();
    }

    function getSB() {
      return window.scriptoraSupabase || null;
    }

    function showChatView() {
      formView.style.display = 'none';
      messagesEl.style.display = 'flex';
      inputRow.style.display = 'flex';
    }

    function appendMsg(sender, text) {
      const label = sender === 'visitor' ? 'You' : sender === 'admin' ? 'Scriptora Team' : 'Scriptora Bot';
      const div = document.createElement('div');
      div.className = 'scw-msg scw-msg-' + sender;
      div.innerHTML = '<span class="scw-msg-label">' + label + '</span>' + escapeHtml(text);
      messagesEl.appendChild(div);
      document.getElementById('scw-body').scrollTop = document.getElementById('scw-body').scrollHeight;
    }

    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }

    async function loadExistingMessages() {
      const sb = getSB();
      if (!sb || !leadId) return;
      const { data } = await sb.from('website_chat_messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true });
      if (data) data.forEach(m => appendMsg(m.sender, m.message));
    }

    function subscribeRealtime() {
      const sb = getSB();
      if (!sb || !leadId || realtimeChannel) return;
      realtimeChannel = sb.channel('scw-lead-' + leadId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_messages', filter: `lead_id=eq.${leadId}` }, (payload) => {
          if (payload.new.sender === 'admin') appendMsg('admin', payload.new.message);
        })
        .subscribe();
    }

    /* Start chat */
    startBtn.addEventListener('click', async () => {
      const name    = nameInput.value.trim();
      const email   = emailInput.value.trim();
      const dept    = deptSelect.value;
      const message = msgTextarea.value.trim();

      if (!name || !email || !dept || !message) {
        formError.textContent = 'সব field fill করুন।';
        return;
      }
      formError.textContent = '';
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';

      const sb = getSB();
      if (!sb) console.warn('[Scriptora ChatWidget] window.scriptoraSupabase পাওয়া যায়নি — এই page-এ supabase-js CDN + shared/supabaseClient.js লোড হয়েছে কিনা check করুন। Widget local-only mode-এ চলবে (কিছু save হবে না)।');
      const clientId = localStorage.getItem('scriptora_client_id') || null;

      if (sb) {
        const { data: lead, error } = await sb.from('website_chat_leads').insert({
          name, email, department: dept, client_id: clientId, page_source: pageSource, status: 'open',
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

      showChatView();
      appendMsg('visitor', message);
      const fallbackReply = (DEPT_REPLIES[dept] || DEPT_REPLIES['General Inquiry']) + (online ? '' : ' (বর্তমানে আমরা অফিস সময়ের বাইরে আছি — কাজের সময় সকাল ১০টা–রাত ১০টা)');
      appendMsg('bot', fallbackReply);

      startBtn.disabled = false;
      startBtn.textContent = 'Start The Chat';
    });

    /* Send follow-up message */
    async function sendFollowUp() {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      appendMsg('visitor', text);

      const sb = getSB();
      if (sb && leadId) {
        const { error } = await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'visitor', message: text });
        if (error) console.error('[Scriptora ChatWidget] message insert failed:', error);
      }
    }
    sendBtn.addEventListener('click', sendFollowUp);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFollowUp(); });
  }

})();
