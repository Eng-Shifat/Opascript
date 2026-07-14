/* ================================================================
   SAVE AT: shared/chatbot/modules/ai/ai.intents.js
   Pure keyword-based intent classifier. Kono import nei — kono AI
   SDK na, vanilla JS shudhu. ai.module.js eita use kore bujhte je
   user ki jiggesh korche, ar dorkar hole handoff trigger kore.
   ================================================================ */

const INTENTS = [
  { key: 'pricing',    keywords: ['price', 'pricing', 'cost', 'koto taka', 'koto', 'taka', '৳', 'charge', 'fee', 'rate', 'expensive', 'cheap'] },
  { key: 'package',    keywords: ['package', 'plan', 'bundle', 'tier', 'options', 'which package'] },
  { key: 'service',    keywords: ['service', 'thesis', 'proposal', 'dissertation', 'assignment', 'writing help', 'research paper'] },
  { key: 'order',      keywords: ['my order', 'order status', 'track', 'progress', 'delivery date', 'order number'] },
  { key: 'sample',     keywords: ['sample', 'example', 'portfolio', 'previous work', 'show me work', 'demo'] },
  { key: 'payment',    keywords: ['payment', 'pay', 'bkash', 'nagad', 'card payment', 'installment', 'invoice', 'receipt'] },
  { key: 'deadline',   keywords: ['deadline', 'due date', 'how long', 'turnaround', 'urgent', 'fast', 'rush'] },
  { key: 'revision',   keywords: ['revision', 'revise', 'edit again', 'rework', 'changes needed'] },
  { key: 'refund',     keywords: ['refund', 'money back', 'cancel order', 'cancellation', 'return money'] },
  { key: 'citation',   keywords: ['citation', 'apa', 'mla', 'chicago', 'harvard style', 'reference', 'bibliography'] },
  { key: 'grammar',    keywords: ['grammar', 'proofread', 'editing', 'language check', 'spelling'] },
  { key: 'plagiarism', keywords: ['plagiarism', 'turnitin', 'similarity', 'originality', 'copied', 'copy paste'] },
  { key: 'contact',    keywords: ['contact', 'phone number', 'email address', 'whatsapp', 'reach you', 'office'] },
  { key: 'human',      keywords: ['human', 'real person', 'agent', 'talk to someone', 'representative', 'manusher sathe', 'manush'] },
];

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

/* confidence: 0..1. Longer/more specific keyword matches and multiple
   matches score higher; a single short/common word scores modestly —
   deliberately conservative so short generic words don't over-trigger
   things like human handoff. */
function detectIntent(text) {
  const q = normalize(text);
  if (!q) return { intent: 'unknown', confidence: 0, matches: [] };

  let best = { intent: 'unknown', confidence: 0, matches: [] };

  INTENTS.forEach(({ key, keywords }) => {
    const matches = keywords.filter((kw) => q.includes(kw));
    if (matches.length === 0) return;

    const specificity = matches.reduce((sum, kw) => sum + kw.length, 0) / Math.max(12, q.length);
    const confidence = Math.min(1, 0.35 + Math.min(0.4, specificity) + (matches.length - 1) * 0.15);

    if (confidence > best.confidence) {
      best = { intent: key, confidence: Number(confidence.toFixed(2)), matches };
    }
  });

  return best;
}

export const Intents = { INTENTS, detectIntent };
