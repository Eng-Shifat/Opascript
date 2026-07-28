/* ================================================================
   SAVE AT: shared/chatbot/modules/ai/ai.intents.js
   Pure keyword-based intent classifier. Kono import nei — kono AI
   SDK na, vanilla JS shudhu. ai.module.js eita use kore bujhte je
   user ki jiggesh korche, ar dorkar hole handoff trigger kore.
   ================================================================ */

const INTENTS = [
  { key: 'pricing',    keywords: ['price', 'pricing', 'cost', 'koto taka', 'koto', 'taka', '৳', 'charge', 'fee', 'rate', 'expensive', 'cheap', 'কতো টাকা', 'কত টাকা', 'দাম', 'মূল্য', 'daam', 'mulyo', 'koto dam', 'how much'] },
  { key: 'package',    keywords: ['package', 'plan', 'bundle', 'tier', 'options', 'which package', 'প্যাকেজ', 'package ki'] },
  { key: 'service',    keywords: ['service', 'thesis', 'proposal', 'dissertation', 'assignment', 'writing help', 'research paper', 'সেবা', 'থিসিস', 'প্রস্তাব', 'seva', 'help koro', 'help korbe'] },
  { key: 'order',      keywords: ['my order', 'order status', 'track', 'progress', 'delivery date', 'order number', 'আমার অর্ডার', 'order koi', 'order diyechi'] },
  { key: 'sample',     keywords: ['sample', 'example', 'portfolio', 'previous work', 'show me work', 'demo', 'নমুনা', 'উদাহরণ', 'dekhan', 'dekhao'] },
  { key: 'payment',    keywords: ['payment', 'pay', 'bkash', 'nagad', 'card payment', 'installment', 'invoice', 'receipt', 'বিকাশ', 'নগদ', 'পেমেন্ট', 'টাকা দেবো', 'taka debo', 'pay korbo'] },
  { key: 'deadline',   keywords: ['deadline', 'due date', 'how long', 'turnaround', 'urgent', 'fast', 'rush', 'কতদিন', 'kotdin', 'জরুরি', 'joruri', 'দ্রুত', 'druto', 'কত সময়'] },
  { key: 'revision',   keywords: ['revision', 'revise', 'edit again', 'rework', 'changes needed', 'পরিবর্তন', 'ঠিক করো', 'thik koro', 'change'] },
  { key: 'refund',     keywords: ['refund', 'money back', 'cancel order', 'cancellation', 'return money', 'ফেরত', 'ফেরত দাও', 'ferot', 'cancel'] },
  { key: 'citation',   keywords: ['citation', 'apa', 'mla', 'chicago', 'harvard style', 'reference', 'bibliography', 'রেফারেন্স', 'সাইটেশন'] },
  { key: 'grammar',    keywords: ['grammar', 'proofread', 'editing', 'language check', 'spelling', 'গ্রামার', 'ভুল ঠিক', 'vul thik', 'editing'] },
  { key: 'plagiarism', keywords: ['plagiarism', 'turnitin', 'similarity', 'originality', 'copied', 'copy paste', 'টার্নিটিন', 'কপি', 'copy', 'unique'] },
  { key: 'contact',    keywords: ['contact', 'phone number', 'email address', 'whatsapp', 'reach you', 'office', 'যোগাযোগ', 'jogajog', 'number dao', 'connect'] },
  { key: 'human',      keywords: ['human', 'real person', 'agent', 'talk to someone', 'representative', 'manusher sathe', 'manush', 'মানুষ', 'কারো সাথে', 'expert', 'karo shathe', 'help chai', 'support'] },
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
