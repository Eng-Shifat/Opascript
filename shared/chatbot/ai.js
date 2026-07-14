/* ================================================================
   SCRIPTORA — chatbot/ai.js
   AI reply generation. Ekhono kono backend deploy kora nei, tai eita
   pluggable — window.SCRIPTORA_AI_ENDPOINT set thakle sheikhane POST
   kore reply anbe, na thakle topic-based fallback reply dekhabe
   (UI test korar jonno, real AI chhara o cholbe).

   Real backend jog korte hole (perbe):
     window.SCRIPTORA_AI_ENDPOINT = 'https://<project-ref>.functions.supabase.co/ai-assistant';
   Edge Function ekta { reply: "..." } shape-er JSON ferot dile'i hobe —
   ai.js-e r kono change lagbe na.
   ================================================================ */

window.ScriptoraChatAI = (function () {

  const FALLBACK_ERROR = 'Ekhon reply generate korte problem hocche. Ektu por abar try korun, na hole "Contact Expert" chapun — amader team direct help korbe.';

  /* ── Topic-based canned replies — Quick Action card / Pill click hole
     eigulo use hoy, ba backend na thakle keyword match diye ── */
  const TOPIC_REPLIES = {
    thesis: 'Amra Honours theke PhD porjonto full thesis writing support dei — topic selection, literature review, methodology, SPSS analysis, ebong final formatting shob kichu. Kon level-er thesis lagbe apnar?',
    pricing: 'Package onujayi price vary kore — thesis-er length, deadline, ebong level (Honours/Masters/PhD) er upor depend kore. Apni ki specific package dekhte chan, naki quote-er jonno details share korben?',
    samples: 'Amader kaj-er quality dekhার jonno kichu sample chapter/thesis dekhano jay. Kon subject/field-er sample lagbe apnar?',
    academic: 'Proposal writing, SPSS data analysis, Turnitin plagiarism check — shob e amra korte pari. Konta niye help lagbe?',
    faq: 'Common questions: deadline flexible kora jay, revision unlimited paben porer 30 din, ebong payment installment-e dewa jay. Aro specific kono question thakle bolun.',
    contact: '__handoff__',
  };

  const PILL_REPLIES = {
    'Honours Thesis': 'Honours thesis-er jonno amra topic theke defense porjonto full support dei. Apnar subject ta ki?',
    'Masters Thesis': 'Masters thesis-e amra literature review, methodology, ebong statistical analysis-e beshi focus kori. Apnar research area ki?',
    'Proposal': 'Research proposal lekhте amra help kori — problem statement theke methodology porjonto. Deadline koto?',
    'SPSS': 'SPSS diye data analysis, hypothesis testing, regression — shob kaj amra kori. Apnar dataset ready ache?',
    'Turnitin': 'Turnitin similarity report check kore amra ensure kori apnar thesis original thake. Report lagbe naki full check?',
    'Pricing': 'Package onujayi price vary kore. Apnar thesis-er level ebong deadline bolle exact quote dite parbo.',
  };

  function getEndpoint() {
    return window.SCRIPTORA_AI_ENDPOINT || null;
  }

  /* history: [{sender:'user'|'ai', text}], userText: latest user message,
     context: {mode, pageSource} */
  async function getReply(history, userText, context) {
    const endpoint = getEndpoint();
    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history, message: userText, context }),
        });
        if (!res.ok) throw new Error('AI endpoint responded ' + res.status);
        const data = await res.json();
        if (data && (data.reply || data.text)) return { text: data.reply || data.text, handoff: !!data.handoff };
        throw new Error('AI endpoint returned empty reply');
      } catch (err) {
        console.error('[Scriptora AI] request failed:', err);
        return { text: FALLBACK_ERROR, handoff: false };
      }
    }
    return { text: canned(userText), handoff: /human|expert|talk to someone|manusher sathe/i.test(userText) };
  }

  function replyForTopic(topicKey) {
    const t = TOPIC_REPLIES[topicKey];
    if (!t) return { text: "Bolun, ki jantey chan?", handoff: false };
    if (t === '__handoff__') return { text: null, handoff: true };
    return { text: t, handoff: false };
  }

  function replyForPill(pillLabel) {
    return { text: PILL_REPLIES[pillLabel] || `${pillLabel} niye amra kotha bolte pari — details ta bolun.`, handoff: false };
  }

  function canned(userText) {
    const q = (userText || '').toLowerCase();
    if (/price|cost|package|taka|৳/.test(q)) return TOPIC_REPLIES.pricing;
    if (/sample|example/.test(q)) return TOPIC_REPLIES.samples;
    if (/spss|turnitin|proposal|plagiarism/.test(q)) return TOPIC_REPLIES.academic;
    if (/thesis/.test(q)) return TOPIC_REPLIES.thesis;
    return "Dhonnobad apnar message-er jonno! AI backend ekhono connect kora hoyni, tai eita ekta demo reply — real answer-er jonno \"Contact Expert\" e click korun, amader team apnake shahajjo korbe.";
  }

  return { getReply, replyForTopic, replyForPill };

})();
