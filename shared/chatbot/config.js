/* ================================================================
   SAVE AT: shared/chatbot/config.js
   Central configuration. Kono module ekhane theke hardcoded value
   read korবে (endpoint, business hours, ityadi) — kono module
   nijer moddhe eigulo hardcode korবে na.
   ================================================================ */

export const Config = {
  /* widgetShell.js style/*.css load korার জন্য base path. Ekhon ei
     module-er nijer location theke absolute URL hishebe derive kora
     hoy (page-relative hardcoded string age bug chilo — Homepage/ ar
     Service page/ different depth-e thakay path bhenge jeto). Kono
     page-e ei script kothao theke include hok na কেন, eta shobsomoy
     thik jaygay resolve hobe. */
  baseUrl: new URL('./', import.meta.url).href,

  /* Ei path-gulote widget mount hobe na (widgetShell.mount() nijei check kore) */
  excludedPages: ['/payment', '/checkout', '/admin'],

  /* Kon module enabled — router.js eigulo register korার age check kore.
     Notun module add korte shudhu ekhane ekta line — kono core file
     touch korte hobe na. */
  modules: {
    ai: { enabled: true },
    liveChat: { enabled: true },   // Phase 4
    orders: { enabled: false },     // future
    pricing: { enabled: false },    // future
    packages: { enabled: false },   // future
    payments: { enabled: false },   // future
    files: { enabled: false },      // future
    faq: { enabled: false },        // future (standalone FAQ browser — ai module already answers FAQ inline)
    notifications: { enabled: false }, // future
    analytics: { enabled: false },  // future
    search: { enabled: false },     // future
  },

  ai: {
    /* Khali thakle ai.service.js automatically knowledge-base fallback-e
       jabe. Real backend ready hole eikhane URL boshate hobe:
       'https://<project-ref>.functions.supabase.co/ai-assistant' */
    endpoint: '',
    timeoutMs: 15000,
    typingDelayMs: 500,
    maxHistoryMessages: 20,

    /* Reserved for future abuse protection (Phase 2 architecture review,
       item 8) — ai.service.js-e ekta checkRateLimit() function ache
       ja ei value gulo pore use korবে. Ekhon enforce kora hocche na. */
    rateLimit: {
      maxMessagesPerMinute: 12,
      cooldownMs: 4000,
    },
  },

  businessHours: {
    timezone: 'Asia/Dhaka',
    startHour: 10,
    endHour: 22,
  },

  featureFlags: {
    showSampleCards: true,
    showPricingCards: true,
    showCitationHelp: true,
  },
};
