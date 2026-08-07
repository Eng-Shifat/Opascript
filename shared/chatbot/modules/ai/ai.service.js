/* ================================================================
   SAVE AT: shared/chatbot/modules/ai/ai.service.js
   Ekমাত্র ei file AI module-er moddhe external kono kichur sathe
   kotha bole — knowledge JSON fetch, ar (thakle) real AI backend
   endpoint. Kono Supabase import nei, kono liveChat/orders/pricing
   import nei — shudhu config.js + knowledge/prompts.js.
   ================================================================ */

import { Config } from '../../config.js';
import { Prompts } from '../../knowledge/prompts.js';

let businessData = null;
let faqData = null;
let knowledgeLoadPromise = null;

const KNOWLEDGE_FILES = [
  'faq.json', 'services.json', 'pricing.json', 'payment.json',
  'delivery.json', 'policies.json', 'workflow.json', 'writers.json',
  'contact.json', 'guarantees.json', 'statistics.json', 'handwritten.json',
];

function resolveKnowledgeUrl(file) {
  return new URL(`../../knowledge/${file}`, import.meta.url).href;
}

async function loadKnowledge() {
  if (knowledgeLoadPromise) return knowledgeLoadPromise;
  knowledgeLoadPromise = (async () => {
    try {
      const results = await Promise.allSettled([
        fetch(resolveKnowledgeUrl('business.json')),
        ...KNOWLEDGE_FILES.map((f) => fetch(resolveKnowledgeUrl(f))),
      ]);

      if (results[0].status === 'fulfilled') {
        businessData = await results[0].value.json();
      }

      const merged = [];
      for (let i = 1; i < results.length; i++) {
        if (results[i].status === 'fulfilled') {
          try {
            const data = await results[i].value.json();
            if (Array.isArray(data)) merged.push(...data);
          } catch (_) {}
        }
      }
      faqData = merged.length ? merged : [];
    } catch (err) {
      console.error('[ai.service] failed to load knowledge base:', err);
      businessData = businessData || {};
      faqData = faqData || [];
    }
  })();
  return knowledgeLoadPromise;
}

function getBusiness() {
  return businessData || {};
}

/* Weighted keyword search across all loaded knowledge files. */
function searchFaq(query, { limit = 1, minScore = 1 } = {}) {
  if (!faqData || !query) return [];
  const q = query.toLowerCase();

  const scored = faqData
    .map((entry) => {
      let score = 0;
      const allKeywords = [
        ...(entry.keywords || []),
        ...(entry.bangla_keywords || []),
        ...(entry.banglish_keywords || []),
      ];
      allKeywords.forEach((kw) => { if (q.includes(kw.toLowerCase())) score += 2; });

      // Match question, topic, service name, description
      const textFields = [entry.question, entry.topic, entry.service, entry.description]
        .filter(Boolean).join(' ').toLowerCase();
      textFields.split(/\s+/).forEach((word) => {
        if (word.length > 3 && q.includes(word)) score += 0.5;
      });

      // Prefer entries that have an answer field
      const answerText = entry.answer || entry.description || '';
      return { entry: { ...entry, answer: answerText }, score };
    })
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.entry);
}

/* Reserved for future abuse protection (Phase 2 architecture review,
   item 8 — "reserve the architecture, do not implement it now").
   Config.ai.rateLimit already holds the numbers this will use.
   Kept as a single stable call site so real limiting can be wired in
   later WITHOUT touching ai.module.js. Currently always allows. */
function checkRateLimit() {
  return { allowed: true };
}

/* Remembers the last FAQ entry that produced a real answer, so
   knowledgeFallback can re-use it for follow-up messages. */
let lastFaqEntry = null;

async function getReply(history, message, context = {}) {
  await loadKnowledge();
  checkRateLimit();

  const endpoint = Config.ai.endpoint;
  if (endpoint) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Config.ai.timeoutMs);
    try {
      const trimmedHistory = history.slice(-Config.ai.maxHistoryMessages);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system: Prompts.system,
          history: trimmedHistory,
          message,
          context,
          business: getBusiness(),
        }),
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('AI endpoint responded ' + res.status);
      const data = await res.json();
      if (data && (data.reply || data.text)) {
        return { text: data.reply || data.text, handoff: !!data.handoff, source: 'api' };
      }
      throw new Error('AI endpoint returned empty reply');
    } catch (err) {
      clearTimeout(timer);
      console.error('[ai.service] backend request failed, falling back to knowledge base:', err);
      return knowledgeFallback(message, lastFaqEntry);
    }
  }

  return knowledgeFallback(message, lastFaqEntry);
}

/* Follow-up phrases that signal the user wants to continue the last
   topic rather than asking something new. Checked before FAQ search. */
const FOLLOWUP_PHRASES = [
  'details', 'detail', 'details bolo', 'details dao', 'ektu details',
  'aro bolo', 'aro kichu', 'explain', 'explain more', 'tell me more',
  'more info', 'more details', 'bolo', 'bolun', 'janao', 'janate chai',
  'continue', 'then', 'then?', 'so?', 'go on', 'and?', 'ok then',
  'what else', 'ki aro', 'aro', 'bistarito', 'bistar', 'বিস্তারিত',
  'বলো', 'বলুন', 'জানাও', 'আরো বলো', 'আরো', 'তারপর', 'তাহলে',
];

function isFollowUp(message) {
  const m = message.trim().toLowerCase().replace(/[?।!]+$/, '').trim();
  return FOLLOWUP_PHRASES.some((p) => m === p || m === p + ' bolo' || m === p + ' dao');
}

function knowledgeFallback(message, lastFaqEntry) {
  /* If the message is a follow-up phrase AND we have a previous match,
     return that same answer so the conversation stays on topic. */
  if (lastFaqEntry && isFollowUp(message)) {
    return { text: lastFaqEntry.answer, handoff: false, source: 'faq' };
  }

  const matches = searchFaq(message, { limit: 1 });
  if (matches.length) {
    lastFaqEntry = matches[0];
    return { text: matches[0].answer, handoff: false, source: 'faq' };
  }
  return { text: Prompts.fallback, handoff: false, source: 'fallback' };
}

export const AiService = { loadKnowledge, getBusiness, searchFaq, getReply, checkRateLimit };
