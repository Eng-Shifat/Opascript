/* ================================================================
   SAVE AT: shared/chatbot/modules/liveChat/liveChat.service.js
   Ekমাত্র ei file Live Chat module-er moddhe Supabase-er sathe kotha
   bole — insert/update/select ar realtime subscribe/presence, sob
   ekhane. ai.service.js-er exact same discipline follow kora hoyeche:
   kono EventBus import nei, kono State import nei — ei file shudhu
   data DEY (ba callback call kore), kokhono nijer theke event emit
   ba state set kore na. Caller (liveChat.module.js) callback shomvog
   kore, module.js-i shei callback-er vitor EventBus.emit +
   LiveChatState.set kore.

   REUSE, DUPLICATE NA: website_chat_leads ar website_chat_messages
   dutai age theke existing table — kono notun leads/messages table
   toiri kora hoyni. Shudhu approved architecture onujayi:
     - website_chat_leads-e 3 ta nullable column lagবে:
         assigned_admin_id uuid, queue_joined_at timestamptz,
         last_seen_at timestamptz
     - ekta notun dedicated table lagবে (leads-er upor bole feedback
       na, alada, one-to-many):
         website_chat_feedback (id, lead_id, rating, comment, created_at)
   Ei column/table gulo Supabase-e SQL diye age theke toiri thakte
   hobe — ei file shudhu dhore ney oigulo ache, nijei toiri kore na.

   ⚠️ IMPORTANT DB SETTING: subscribeQueueChannel()-er UPDATE diffing
   `payload.old.status` / `payload.old.assigned_admin_id` porte chay.
   Supabase/Postgres default-e UPDATE-er `old` record-e shudhu primary
   key thake, baki column na — tai ei column gulo thik pete hole
   website_chat_leads table-e ei SQL ekbar run kora REQUIRED:
     ALTER TABLE website_chat_leads REPLICA IDENTITY FULL;
   Eta na korle queue position update kaj korবে na (silently wrong
   `old` data pabe), tai eta code-er bug na, ekta DB setup step.
   ================================================================ */

const TABLE_LEADS = 'website_chat_leads';
const TABLE_MESSAGES = 'website_chat_messages';
const TABLE_FEEDBACK = 'website_chat_feedback';

function getSB() {
  const sb = window.scriptoraSupabase || null;
  if (!sb) {
    console.warn('[liveChat.service] window.scriptoraSupabase পাওয়া যায়নি — supabase-js CDN + shared/supabaseClient.js load হয়েছে কিনা check করুন। Live Chat local-only mode-এ চলবে (কিছু persist হবে না)।');
  }
  return sb;
}

/* ---------------------------------------------------------------
   LEAD CREATION
   --------------------------------------------------------------- */

async function createLead({ name, email, phone, department, pageSource, clientId }) {
  const sb = getSB();
  if (!sb) return { lead: null, error: new Error('Supabase client unavailable') };

  const joinedAt = new Date().toISOString();
  const { data, error } = await sb
    .from(TABLE_LEADS)
    .insert({
      name,
      email,
      phone: phone || null,
      department,
      client_id: clientId || null,
      page_source: pageSource,
      status: 'open',
      assigned_admin_id: null,
      queue_joined_at: joinedAt,
    })
    .select()
    .single();

  if (error) console.error('[liveChat.service] createLead failed:', error);
  return { lead: data || null, error: error || null };
}

/* ---------------------------------------------------------------
   QUEUE
   --------------------------------------------------------------- */

/* One-time COUNT — establishes the STARTING position only. Every
   update after this comes from subscribeQueueChannel()'s realtime
   diffs, never another COUNT (Phase 4 architecture refinement,
   Section 2 — this is the whole point of the scalable queue design). */
async function getQueuePosition(queueJoinedAt) {
  const sb = getSB();
  if (!sb) return { position: 0, error: new Error('Supabase client unavailable') };

  const { count, error } = await sb
    .from(TABLE_LEADS)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .is('assigned_admin_id', null)
    .lt('queue_joined_at', queueJoinedAt);

  if (error) {
    console.error('[liveChat.service] getQueuePosition failed:', error);
    return { position: 0, error };
  }
  return { position: count || 0, error: null };
}

/* Visitor cancels while still waiting (navigated away, changed mind).
   Guarded by .is('assigned_admin_id', null) — a no-op if an admin
   already accepted, since an assigned lead isn't "in queue" anymore
   and shouldn't be silently closed out from under the admin. */
async function leaveQueue(leadId) {
  const sb = getSB();
  if (!sb) return { error: new Error('Supabase client unavailable') };
  const { error } = await sb
    .from(TABLE_LEADS)
    .update({ status: 'closed' })
    .eq('id', leadId)
    .is('assigned_admin_id', null);
  if (error) console.error('[liveChat.service] leaveQueue failed:', error);
  return { error: error || null };
}

/* Shared queue channel — every waiting visitor subscribes to this ONE
   channel and reclassifies postgres_changes events into join/left
   diffs client-side, instead of each of them re-running a COUNT.
     onJoined(row) — a new lead entered the (unassigned, open) queue
     onLeft(row)   — a lead left the queue (assigned OR abandoned/closed) */
function subscribeQueueChannel({ onJoined, onLeft }) {
  const sb = getSB();
  if (!sb) return null;

  const channel = sb
    .channel('livechat-queue')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE_LEADS }, (payload) => {
      const row = payload.new;
      if (row.status === 'open' && !row.assigned_admin_id) onJoined && onJoined(row);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE_LEADS }, (payload) => {
      const row = payload.new;
      const prev = payload.old || {};
      const wasWaiting = prev.status === 'open' && !prev.assigned_admin_id;
      const stillWaiting = row.status === 'open' && !row.assigned_admin_id;
      if (wasWaiting && !stillWaiting) onLeft && onLeft(row); // assigned, or closed while still waiting
    })
    .subscribe();

  return channel;
}

/* ---------------------------------------------------------------
   PER-LEAD REALTIME — messages + assignment/close + presence/typing,
   ALL on one channel (approved architecture, Section 1: reuse the
   existing per-lead channel for presence instead of a second one).
   --------------------------------------------------------------- */

function subscribeToLead(leadId, { onMessage, onAssigned, onClosed, onPresenceSync }) {
  const sb = getSB();
  if (!sb) return null;

  const channel = sb
    .channel('livechat-lead-' + leadId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE_MESSAGES, filter: `lead_id=eq.${leadId}` },
      (payload) => { onMessage && onMessage(payload.new); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLE_LEADS, filter: `id=eq.${leadId}` },
      (payload) => {
        const row = payload.new;
        if (row.assigned_admin_id && row.status === 'open') onAssigned && onAssigned(row);
        if (row.status === 'closed') onClosed && onClosed(row);
      }
    )
    .on('presence', { event: 'sync' }, () => {
      onPresenceSync && onPresenceSync(channel.presenceState());
    })
    .subscribe();

  return channel;
}

/* Visitor's (or admin's, once Admin Dashboard is extended) own
   presence on a lead's channel — role + typing flag. Only ever tracks
   THIS client's own state; other participants' state arrives through
   subscribeToLead's onPresenceSync callback above. */
function trackPresence(channel, state) {
  if (!channel) return;
  channel.track(state);
}

/* ---------------------------------------------------------------
   ADMIN ROSTER PRESENCE — "is ANY admin online right now?" — separate
   concern from a specific lead's typing/online state (approved
   architecture, Section 1: a second, separate channel).
   --------------------------------------------------------------- */

function subscribeAdminRoster({ onChange }) {
  const sb = getSB();
  if (!sb) return null;

  const channel = sb
    .channel('livechat-admin-roster')
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const anyOnline = Object.keys(state).length > 0;
      onChange && onChange(anyOnline);
    })
    .subscribe();

  return channel;
}

/* ---------------------------------------------------------------
   MESSAGING — same table, same column shape the legacy widget and
   Admin Dashboard already use. Nothing new here structurally.
   --------------------------------------------------------------- */

async function sendMessage(leadId, text) {
  const sb = getSB();
  if (!sb) return { error: new Error('Supabase client unavailable') };
  const { error } = await sb
    .from(TABLE_MESSAGES)
    .insert({ lead_id: leadId, sender: 'visitor', message: text, message_type: 'text' });
  if (error) console.error('[liveChat.service] sendMessage failed:', error);
  return { error: error || null };
}

async function loadExistingMessages(leadId) {
  const sb = getSB();
  if (!sb) return { messages: [], error: new Error('Supabase client unavailable') };
  const { data, error } = await sb
    .from(TABLE_MESSAGES)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) console.error('[liveChat.service] loadExistingMessages failed:', error);
  return { messages: data || [], error: error || null };
}

/* ---------------------------------------------------------------
   FEEDBACK — dedicated table (Section 3 of the refinement doc).
   Never written onto website_chat_leads.
   --------------------------------------------------------------- */

async function submitFeedback(leadId, { rating, comment }) {
  const sb = getSB();
  if (!sb) return { error: new Error('Supabase client unavailable') };
  const { error } = await sb
    .from(TABLE_FEEDBACK)
    .insert({ lead_id: leadId, rating: rating ?? null, comment: comment || null });
  if (error) console.error('[liveChat.service] submitFeedback failed:', error);
  return { error: error || null };
}

/* ---------------------------------------------------------------
   CLEANUP
   --------------------------------------------------------------- */

function unsubscribe(channel) {
  if (!channel) return;
  const sb = getSB();
  if (sb) sb.removeChannel(channel);
}

export const LiveChatService = {
  createLead,
  getQueuePosition,
  leaveQueue,
  subscribeQueueChannel,
  subscribeToLead,
  trackPresence,
  subscribeAdminRoster,
  sendMessage,
  loadExistingMessages,
  submitFeedback,
  unsubscribe,
};
