# SCRIPTORA AI ASSISTANT — PRODUCT DESIGN SPECIFICATION
### Version 1.0 · Design Phase Only (No Code)

---

## 1. PRODUCT OVERVIEW

**What it is:** Scriptora AI Assistant is not a support widget bolted onto the site — it is the primary front door to the entire platform. A visitor should be able to arrive on Scriptora, never touch the navbar, and still walk away having learned about services, seen pricing, browsed samples, and started a conversation that ends with a human expert. A logged-in client should be able to check an order, see a payment status, or grab a file without leaving the assistant panel.

**Core identity:** *AI Academic Advisor* — closer to a knowledgeable front-desk officer at a university writing center than a customer-support bot. It should never sound like a ticketing system. It should sound like someone who understands theses, proposals, and SPSS deadlines.

**Positioning statement:**
> "Ask, don't browse." The assistant collapses navigation, FAQ, pricing pages, and first-contact sales into one calm surface.

**Two operating modes (same shell, different content):**
1. **Guest / Visitor mode** — discovery-oriented (services, pricing, samples, FAQ, contact).
2. **Authenticated mode** — task-oriented (orders, files, payments, messages), with discovery content still available underneath.

The shell (header, input bar, panel chrome) never changes between these modes — only the content injected into the body changes. This is the single most important architectural decision in this spec, and it's what makes the system "future ready" without redesign.

---

## 2. INFORMATION ARCHITECTURE

```
Scriptora AI Assistant
│
├── Entry Layer (always visible)
│   ├── Header (identity + status + close)
│   ├── Welcome Message (contextual: guest vs client)
│   └── Input Bar (sticky, always reachable)
│
├── Guest Content Layer
│   ├── Quick Action Cards (6 primary intents)
│   ├── Popular Topic Pills (secondary intents)
│   └── Conversation Thread (AI + user messages)
│
├── Authenticated Content Layer
│   ├── Account Snapshot (mini-card: active order status)
│   ├── Quick Actions (My Orders / My Files / Payments / Messages)
│   └── Conversation Thread (same component as guest — reused)
│
└── Escalation Layer
    ├── "Talk to a human expert" handoff card
    └── Contact/booking confirmation state
```

**Why this structure:** Everything below the Input Bar is swappable content inside one scrollable region. The header and input are fixed anchors so the user's sense of "where am I" never breaks, even as the body content changes from marketing cards to order cards to a live chat thread.

---

## 3. COMPLETE LAYOUT BREAKDOWN

### 3.1 Panel shell
- Floating panel, bottom-right anchored (desktop), full-screen sheet (mobile).
- Desktop: ~400px wide × ~640px tall, rounded 24px, glassmorphic dark navy background with a 1px soft purple-tinted border.
- Backdrop: subtle blur behind the panel on desktop when open, so the page feels "paused" but not hidden.

### 3.2 Header (fixed, ~72px)
- Left: circular AI avatar (soft purple gradient ring, subtle breathing glow — same motif as the CTA button glow already used on the Service page).
- Center-left stack: "Scriptora AI" (semibold, 15px) + "Academic Assistant" (12px, muted gray) on the line below.
- Right of the name stack: a small online-status dot (green, soft pulse animation, 6px) — signals "someone/something is available now," not decorative.
- Far right: close (×) button, 40px tap target, ghost-hover background.

### 3.3 Welcome section (~96–120px, collapses once conversation starts)
- Guest: "Hello 👋 Welcome to Scriptora." + one line: "I can help with pricing, samples, and starting your order — just ask."
- Authenticated: "Welcome back, {FirstName} 👋" + one line reflecting live state, e.g. "Your Thesis order is in Writing stage."
- This section fades/collapses (height + opacity transition) the moment the first message is sent, giving the conversation full vertical room.

### 3.4 Quick Action Cards (2-column grid, guest default)
Six cards: Thesis Writing, Pricing, Samples, Academic Help, FAQ, Contact Expert.
- Each card: icon (top-left, 20px, purple-tinted), title (14px semibold), one-line description (12px muted), no border by default — border and slight lift appear on hover.
- Card height uniform (~88px) regardless of description length — description clamps to 1 line with ellipsis.

### 3.5 Popular Topic Pills (single horizontal scroll row, ~40px tall)
Honours Thesis · Masters Thesis · Proposal · SPSS · Turnitin · Pricing
- Pill shape, 1px soft border, transparent fill, text 13px. Selected/hover state fills with a faint purple wash, never a hard block color — keeps the "soft glass" language consistent.

### 3.6 Conversation thread (flexible height, scrollable)
- AI messages: left-aligned, avatar bubble, message background slightly lighter navy than page background so it reads as a "card floating on glass."
- User messages: right-aligned, purple gradient fill (same gradient family as CTA buttons elsewhere on site), white text.
- Typing indicator: three-dot pulse inside an AI bubble shape, not a separate spinner — keeps it feeling conversational rather than "loading."

### 3.7 Input area (fixed bottom, ~64px, sticky)
Left to right: attachment (paperclip icon, 20px) → text input (auto-grow up to 4 lines) → mic icon → send button (circular, purple gradient, disabled/muted state when input empty).
- Input field itself has no visible border at rest; a soft purple glow ring appears on focus (consistent with the "breathing glow" CTA pattern already established on the Service page).

---

## 4. SCREEN WIREFRAME EXPLANATION

**Screen A — Guest, Panel Just Opened**
Header → Welcome (full height) → Quick Action Cards (2×3 grid) → Popular Topic Pills → empty conversation area showing a single centered AI greeting bubble → Input bar.
*Purpose:* Zero-effort orientation. User sees "what can this do" before typing anything.

**Screen B — Guest, Mid-Conversation**
Header (unchanged) → Welcome section collapsed to a thin 0px strip → Quick Action Cards collapsed/hidden (or shrunk to a single "Show topics again" pill) → Conversation thread expanded to fill space → Input bar.
*Purpose:* Once the user commits to a conversation, reclaim all vertical space for the actual dialogue.

**Screen C — Authenticated, Panel Just Opened**
Header → Welcome (personalized) → Account Snapshot mini-card (order name, stage badge, "View full order" link) → 4 Quick Actions (My Orders / My Files / Payments / Messages) → Conversation thread with a contextual AI opener ("Want me to check your Thesis order status?") → Input bar.
*Purpose:* Immediately surface the one thing a returning client is most likely to want, without forcing a question to be typed.

**Screen D — Human Handoff**
A distinct card appears inline in the conversation thread (not a new screen) — avatar row of the assigned expert, one line of confidence-building copy ("Sadia will pick this up — usually replies within 15 minutes"), and a "Notify me" / "Continue chatting" choice.
*Purpose:* The handoff must never feel like a dead end or a redirect away from the product — it's presented as a natural next message in the same thread.

**Screen E — Mobile Full Sheet**
Same content hierarchy as Screen A, but the panel becomes a full-height bottom sheet with a drag handle at the top instead of a close ×, and quick action cards become a single column instead of a 2-column grid.

---

## 5. COMPONENT LIST

| Component | States needed |
|---|---|
| AI Avatar | idle (breathing glow), typing (active pulse) |
| Online Status Dot | online, away/offline |
| Quick Action Card | default, hover, pressed, disabled |
| Topic Pill | default, hover, selected |
| Chat Bubble (AI) | text, typing-indicator, with-card-attachment |
| Chat Bubble (User) | text, text-with-attachment |
| Account Snapshot Card | single active order, multiple orders, no active order |
| Order Status Badge | (reuse existing dashboard badge component — color-coded per status) |
| Human Handoff Card | pending, connected, expert-offline |
| Input Bar | empty, active/focused, with-attachment-preview, disabled (rate-limited) |
| Send Button | disabled, enabled, sending (spinner) |
| Attachment Chip | uploading, uploaded, error |
| Panel Shell | desktop-floating, mobile-full-sheet |
| Empty State (no messages yet) | guest variant, client variant |
| Scroll-to-latest Button | hidden, visible (appears when user scrolls up mid-conversation) |

---

## 6. UX EXPLANATION — KEY DECISIONS

**Why quick-action cards instead of a menu?**
A dropdown menu asks the user to already know what they want. Cards with icon + description let someone scan and recognize intent passively — closer to how Perplexity and Notion AI surface "starter prompts." This matters especially for first-time visitors who don't yet know Scriptora's service names.

**Why collapse the welcome/cards section instead of keeping it visible?**
Every AI-first interface referenced (ChatGPT, Claude, Linear) treats the pre-conversation state as disposable — once intent is established, screen real estate belongs to the content the user asked for. Keeping cards visible during conversation would compete with the thread for attention and make the panel feel cluttered, which directly violates the "never cluttered" philosophy stated in the brief.

**Why does authenticated mode show an Account Snapshot before any question is asked?**
Returning users have a specific, predictable need over 80% of the time: "where's my order." Surfacing it proactively removes a whole turn of conversation ("what's my status?" → answer) and reinforces that the assistant already knows who they are — this is what makes it feel like an assistant rather than a chatbot restarting from zero every session.

**Why is the human handoff a card inside the thread, not a modal or redirect?**
Interrupting with a modal implies the AI has failed and control is being taken away. An inline card frames it as the AI's own recommendation ("I'll bring in a human for this") — preserving trust and continuity rather than signaling a dead end.

**Why pills for topics but cards for actions?**
Cards carry more visual weight and are reserved for the six primary intents (the ones the whole IA is organized around). Pills are lightweight and horizontally scrollable, appropriate for secondary/more numerous options (specific thesis levels, tools) that don't each need a full description line.

---

## 7. DESIGN DECISIONS (RATIONALE SUMMARY)

- **Dark theme + glassmorphism:** Matches the existing Scriptora visual identity (`#070B17` navy, established on the Service page) so the assistant never feels like a third-party plugin.
- **Purple gradient exclusively for actionable elements:** send button, user bubbles, selected pill, primary CTA — color is reserved for "things that respond to you," keeping informational text neutral gray/white for readability.
- **Rounded 20px+ throughout:** Softens what could otherwise feel like a transactional support tool; consistent with premium SaaS references (Linear, Stripe dashboard cards).
- **8px spacing scale reused from the rest of the site:** Prevents the assistant from visually feeling like a separate product bolted onto Scriptora.
- **Inter typeface, no display font:** The assistant's job is legibility and speed of reading, not brand flair — brand flair already lives in the marketing pages.
- **Single shell for guest and authenticated states:** The most important structural decision — it's what lets the "Future Ready" requirement (orders, dashboard, payments, files, notifications, AI memory, human support) get added without ever rebuilding the panel itself.

---

## 8. VISUAL HIERARCHY

1. **Conversation thread** — largest area, highest contrast, always the eventual focal point.
2. **Send button / active input** — purple gradient draws the eye to "what to do next."
3. **Quick action cards** — secondary until clicked, then disappear from hierarchy entirely.
4. **Header identity** — low-motion, always present, but deliberately quiet (small avatar, muted subtitle) so it doesn't compete with content.
5. **Status indicators (online dot, typing indicator)** — smallest visual elements, present only as ambient reassurance, never demanding attention.

Typography scale (reusing existing Inter-based system):
- Panel title: 15px semibold
- Body/messages: 14px regular
- Descriptions/meta: 12–13px, muted gray (`~#8A8FA3` tone against navy)
- Micro labels (status, timestamps): 11px

---

## 9. SUGGESTED IMPROVEMENTS (BEYOND THE ORIGINAL BRIEF)

- **Persistent conversation across page navigation:** if the user closes the panel and browses another page, reopening should restore the thread — position this as "AI memory" done simply, before any real backend memory system exists.
- **Inline rich cards inside AI replies:** e.g. when the AI answers a pricing question, render a small pricing-tier card (reusing the existing 3-tab package switcher visual language from the Service page) instead of plain text — this keeps answers scannable.
- **Confidence-building micro-copy on first open:** a single muted line under the welcome message like "Answers are reviewed by our academic team" — builds trust for an academic-integrity-sensitive audience without over-explaining.
- **Soft rate-limit / cooldown state** for the input bar with a friendly explanation rather than a hard error, to protect against abuse without feeling punitive.
- **Sample-request flow as a first-class quick action outcome:** tapping "Samples" should render a small horizontally-scrollable card gallery inline in the thread rather than a wall of text links.

---

## 10. FUTURE EXPANSION IDEAS

- **Order Tracking inline:** Account Snapshot card expands into a compact version of the existing 6-step horizontal progress stepper from the dashboard — same component, reused, not redesigned.
- **File delivery inside chat:** locked-file "genie" unlock animation (already built for the dashboard) triggered from a chat bubble when a file becomes available.
- **Payment prompts:** an inline "payment due" card (reusing the dashboard's Payment Summary states) appearing proactively in conversation near a milestone.
- **Notifications feed:** a small bell icon in the header, opening a slide-down list — reuses the same `admin_notifications`-style table pattern already used on the admin side.
- **Multi-language toggle** (Bangla/English) given the primary user base — the assistant should be able to respond naturally in Banglish, matching how Scriptora's actual users communicate.

---

## 11. PREMIUM FEATURE IDEAS

- **Ambient ready-state glow:** the floating launcher button (closed state) uses the same breathing-glow motif as the Service page CTA, so it visually says "I'm alive" before it's even opened.
- **Contextual quick actions per page:** if opened from the Thesis Writing service page, the guest quick-actions reorder to put "Thesis Writing" and "Pricing" first — same six cards, smarter default order.
- **Expert "presence" preview:** in the handoff card, show a small avatar + "usually replies in ~15 min" — sourced from real response-time data over time.
- **Read receipts / delivered indicator** on user messages once a human joins — small, subtle, borrowed from messaging-app conventions users already trust.

---

## 12. FIGMA-LEVEL SCREEN DESCRIPTION (HANDOFF NOTES)

**Frame naming convention:** `AI-Assistant / [Mode] / [State]` — e.g. `AI-Assistant / Guest / Empty`, `AI-Assistant / Guest / Conversation`, `AI-Assistant / Client / Snapshot`, `AI-Assistant / Handoff / Pending`.

**Auto-layout guidance for the builder:**
- Panel root: vertical auto-layout, fixed width (desktop) / fill (mobile), 3 children — Header (fixed height), Body (fill, scrollable), Input (fixed height).
- Body: vertical auto-layout with independent internal scroll; Welcome + Cards + Pills form one collapsible group at the top, Conversation thread fills remaining space below it.
- Quick Action Card grid: 2-column auto-layout wrap, 8px gap, equal-width children.
- Chat bubble: hug-width auto-layout with max-width constraint (~80% of body width) so short messages don't stretch full-width.

**States to prototype (interactive, no logic needed):**
1. Launcher closed → click → panel opens with Screen A.
2. Type in input → send → Welcome/cards collapse (height animation) → Screen B.
3. Toggle "Guest" vs "Authenticated" frame variant to show Screen C.
4. Click a Quick Action card → conversation shows an AI reply referencing that card's topic.
5. Click "Contact Expert" → Screen D (handoff card) appears as the next message in-thread.

**Redlines a developer needs (to be filled once visual design is finalized in Figma, not guessed here):** exact hex values already established (`#070B17` base navy, existing purple gradient stops from `service.css`), the 8px spacing tokens already in use, and the Inter font weights already loaded elsewhere in Scriptora — this spec deliberately reuses those tokens rather than inventing new ones, per the "no redesign" future-ready requirement.

---

### CLOSING NOTE FOR THE DEVELOPER
Nothing above prescribes HTML/CSS/JS structure or component code — per the brief, this is architecture and rationale only. The one hard constraint to preserve when this becomes a build: **the shell (header + input) never changes; only the body content swaps.** That single rule is what makes every future feature in Section 10 an addition, not a redesign.
