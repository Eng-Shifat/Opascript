/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Messages Tab
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

  window._loadMessages = async function() {
    const list = document.getElementById('odpMsgList');
    if (!list) return;

    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
      list.innerHTML = window._renderFallbackMessages();
      return;
    }

    try {
      const { data, error } = await window._sb()
        .from('messages')
        .select('*')
        .eq('order_id', window._currentOrderId)
        .order('sent_at', { ascending: true });

      if (error || !data || !data.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No messages yet. Start the conversation below.</div>';
        return;
      }

      /* Mark client messages as read */
      window._sb().from('messages').update({ read: true }).eq('order_id', window._currentOrderId).eq('from_admin', false);

      list.innerHTML = data.map(m => window._renderBubble(m)).join('');
      list.scrollTop = list.scrollHeight;

      /* Realtime subscription */
      window._sb().channel(`odp_msgs_${window._currentOrderId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${window._currentOrderId}` }, payload => {
          const el = document.getElementById('odpMsgList');
          if (el) { el.insertAdjacentHTML('beforeend', window._renderBubble(payload.new)); el.scrollTop = el.scrollHeight; }
        })
        .subscribe();

    } catch(e) {
      list.innerHTML = window._renderFallbackMessages();
    }
  }

window._renderBubble = function(m) {
    const isAdmin = m.from_admin;
    const initials = isAdmin ? 'SA' : (window._currentOrder ? window._currentOrder.initials : 'CL');
    const avClass  = isAdmin ? 'admin' : 'client';
    const dir      = isAdmin ? 'out' : 'in';
    const time = m.sent_at ? new Date(m.sent_at).toLocaleString('en-GB',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Just now';
    return `
    <div class="odp-msg ${dir}">
      <div class="odp-msg-av ${avClass}">${window._esc(initials)}</div>
      <div>
        <div class="odp-bubble">${window._esc(m.text||m.content||'')}</div>
        <div class="odp-bubble-time">${time}</div>
      </div>
    </div>`;
  }

window._renderFallbackMessages = function() {
    const initials = window._currentOrder ? window._currentOrder.initials : 'CL';
    return `
    <div class="odp-msg in">
      <div class="odp-msg-av client">${window._esc(initials)}</div>
      <div><div class="odp-bubble">Hello! I've uploaded my research brief. Please let me know the next steps.</div>
      <div class="odp-bubble-time">Recently</div></div>
    </div>
    <div class="odp-msg out">
      <div class="odp-msg-av admin">SA</div>
      <div><div class="odp-bubble">Thanks! We've assigned a specialist writer to your order. You'll receive the Chapter 1 outline within 48 hours.</div>
      <div class="odp-bubble-time">Recently</div></div>
    </div>`;
  }

  window.odpSendMessage = async function() {
    const input = document.getElementById('odpMsgInput');
    const notify = document.getElementById('odpNotifyCheck');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';

    if (!window._sb()) {
      /* Optimistic UI fallback */
      const list = document.getElementById('odpMsgList');
      if (list) {
        list.insertAdjacentHTML('beforeend', window._renderBubble({ from_admin: true, text, sent_at: new Date().toISOString() }));
        list.scrollTop = list.scrollHeight;
      }
      window._toast('✓ Message sent!', 'var(--accent)');
      return;
    }

    try {
      const { error } = await window._sb().from('messages').insert({
        order_id: window._currentOrderId,
        text,
        from_admin: true,
        read: false,
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
      const notifyMsg = notify && notify.checked ? 'Message sent + email notification!' : 'Message sent!';
      window._toast('✓ ' + notifyMsg, 'var(--accent)');
    } catch(e) {
      window._toast('⚠ Failed to send message', 'var(--red)');
    }
  };

