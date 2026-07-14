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

function resolveKnowledgeUrl(file) {
  // ai.service.js nijer URL-er upor relative — deployment-e file
  // jekhane hok move hole o path thik thake
  return new URL(`../../knowledge/${file}`, import.meta.url).href;
}

async function loadKnowledge() {
  if (knowledgeLoadPromise) return knowledgeLoadPromise;
  knowledgeLoadPromise = (async () => {
    try {
      const [bizRes, faqRes] = await Promise.all([
        fetch(resolveKnowledgeUrl('business.json')),
        fetch(resolveKnowledgeUrl('faq.json')),
      ]);
      businessData = await bizRes.json();
      faqData = await faqRes.json();
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

/* Simple weighted keyword search over faq.json — no AI SDK. */
function searchFaq(query, { limit = 1, minScore = 1 } = {}) {
  if (!faqData || !query) return [];
  const q = query.toLowerCase();

  const scored = faqData
    .map((entry) => {
      let score = 0;
      (entry.keywords || []).forEach((kw) => { if (q.includes(kw.toLowerCase())) score += 2; });
      entry.question.toLowerCase().split(/\s+/).forEach((word) => {
        if (word.length > 3 && q.includes(word)) score += 0.5;
      });
      return { entry, score };
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
      return knowledgeFallback(message);
    }
  }

  return knowledgeFallback(message);
}

function knowledgeFallback(message) {
  const matches = searchFaq(message, { limit: 1 });
  if (matches.length) return { text: matches[0].answer, handoff: false, source: 'faq' };
  return { text: Prompts.fallback, handoff: false, source: 'fallback' };
}

export const AiService = { loadKnowledge, getBusiness, searchFaq, getReply, checkRateLimit };
