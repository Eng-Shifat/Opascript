/* ================================================================
   SCRIPTORA — chatbot/liveChat.js
   Human/Admin handoff. Purono shared/chatWidget.js-er Supabase logic
   (website_chat_leads / website_chat_messages) eikhane reuse kora
   hoyeche — schema same, tai Admin Dashboard-er
   admin-website-chats.html changes chhara e kaj korbe.
   ================================================================ */

window.ScriptoraLiveChat = (function () {

  const ONLINE_START_HOUR = 10; // সকাল ১০টা
  const ONLINE_END_HOUR   = 22; // রাত ১০টা

  const path = window.location.pathname;
  const pageSource = path.includes('Homepage')      ? 'Homepage'
                    : path.includes('Service page')  ? 'Thesis Writing Page'
                    : 'Other';

  let leadId = sessionStorage.getItem('scw_v2_lead_id') || null;
  let realtimeChannel = null;
  let incomingHandler = null;

  function getSB() {
    return window.scriptoraSupabase || null;
  }

  function isOnlineNow() {
    const bdHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false });
    const h = parseInt(bdHour, 10);
    return h >= ONLINE_START_HOUR && h < ONLINE_END_HOUR;
  }

  function getRegisteredIdentity() {
    const clientId = localStorage.getItem('scriptora_client_id') || null;
    const name = localStorage.getItem('scriptora_name') || '';
    const email = localStorage.getItem('scriptora_email') || '';
    return clientId ? { clientId, name, email } : null;
  }

  function currentLeadId() {
    return leadId;
  }

  /* ── Registered client hole shorasori lead create kore dey, guest
     hole caller-ke bole je form dekhate hobe ── */
  async function startHandoff(department) {
    const identity = getRegisteredIdentity();
    if (identity && identity.name && identity.email) {
      const { leadId: id, error } = await createLead({
        name: identity.name, email: identity.email, phone: null,
        department, clientId: identity.clientId,
      });
      return { needsForm: false, leadId: id, error };
    }
    return { needsForm: true };
  }

  async function createLead({ name, email, phone, department, clientId }) {
    const sb = getSB();
    if (!sb) {
      console.warn('[Scriptora LiveChat] window.scriptoraSupabase not found — running local-only, kichu save hobe na.');
      leadId = 'local_' + Date.now();
      return { leadId };
    }
    const { data: lead, error } = await sb.from('website_chat_leads').insert({
      name, email, phone: phone || null, department: department || 'General Inquiry',
      client_id: clientId || null, page_source: pageSource, status: 'open',
    }).select().single();

    if (error) {
      console.error('[Scriptora LiveChat] lead insert failed:', error);
      return { leadId: null, error };
    }
    leadId = lead.id;
    sessionStorage.setItem('scw_v2_lead_id', leadId);
    if (!clientId && phone) localStorage.setItem('scriptora_guest_phone', phone);
    return { leadId };
  }

  async function submitLeadForm({ name, email, phone, department }) {
    if (!name || !email || !phone) return { error: { message: 'সব field fill করুন।' } };
    if (!/^[+]?[\d\s-]{7,15}$/.test(phone)) return { error: { message: 'সঠিক মোবাইল নম্বর দিন।' } };
    return createLead({ name, email, phone, department });
  }

  async function sendMessage(text) {
    const sb = getSB();
    if (!sb || !leadId) return;
    const { error } = await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'visitor', message: text });
    if (error) { console.error('[Scriptora LiveChat] message insert failed:', error); return; }
    await sb.from('website_chat_leads').update({ status: 'open' }).eq('id', leadId);
  }

  async function sendInitialMessage(text, department) {
    const sb = getSB();
    if (!sb || !leadId) return;
    await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'visitor', message: text });
    const online = isOnlineNow();
    const note = online ? '' : ' (বর্তমানে আমরা অফিস সময়ের বাইরে আছি — কাজের সময় সকাল ১০টা–রাত ১০টা)';
    const botReply = `${department || 'General Inquiry'} team-কে notify করা হয়েছে। আমাদের একজন expert শীঘ্রই আপনাকে reply করবেন।${note}`;
    await sb.from('website_chat_messages').insert({ lead_id: leadId, sender: 'bot', message: botReply });
  }

  /* ── Realtime — admin/bot-er notun message ashle onIncoming(msg) call hobe ── */
  function subscribe(onIncoming) {
    incomingHandler = onIncoming;
    const sb = getSB();
    if (!sb || !leadId || realtimeChannel) return;
    realtimeChannel = sb.channel('scw-v2-lead-' + leadId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_messages', filter: `lead_id=eq.${leadId}` }, (payload) => {
        if ((payload.new.sender === 'admin' || payload.new.sender === 'bot') && incomingHandler) {
          incomingHandler(payload.new);
        }
      })
      .subscribe();
  }

  async function loadExistingMessages() {
    const sb = getSB();
    if (!sb || !leadId) return [];
    const { data } = await sb.from('website_chat_messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true });
    return data || [];
  }

  function hasActiveLead() {
    return !!leadId;
  }

  return {
    isOnlineNow, getRegisteredIdentity, startHandoff, submitLeadForm,
    sendMessage, sendInitialMessage, subscribe, loadExistingMessages,
    hasActiveLead, currentLeadId,
  };

})();
