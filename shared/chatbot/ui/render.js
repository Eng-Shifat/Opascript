/* ================================================================
   SCRIPTORA CHATBOT V2 — ui/render.js
   Generic rendering mechanics only — kono module/feature-specific
   logic ekhane thakbe na. Prottek module nijer content ei helper-er
   modhome body-te "patch" kore, pura innerHTML replace na kore
   (jate typing kora obosthay ba scroll position hariye na jai).
   ================================================================ */

function htmlToElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

/* Prothom-bar render — pura container-er content set kore. */
function mount(container, html) {
  if (!container) return;
  container.innerHTML = html;
}

/* Full replace, kintu scroll position/at-bottom obostha preserve kore
   — module-er nijer view (jemon Orders list) update korte use hoy. */
function patch(container, html, { preserveScroll = false } = {}) {
  if (!container) return;
  let prevTop = 0;
  let wasAtBottom = true;
  if (preserveScroll) {
    prevTop = container.scrollTop;
    wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 4;
  }
  container.innerHTML = html;
  if (preserveScroll) {
    requestAnimationFrame(() => {
      container.scrollTop = wasAtBottom ? container.scrollHeight : prevTop;
    });
  }
}

function scrollToBottom(container, smooth = false) {
  if (!container) return;
  requestAnimationFrame(() => {
    if (smooth && container.scrollTo) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    else container.scrollTop = container.scrollHeight;
  });
}

/* Keyed list reconciliation — message threads, notification lists,
   timeline steps, ityadi. Shudhu ja change hoyeche shei DOM node-ta
   touch kore, baki shob jayga-e thake — full re-render korle na, tai
   input focus/animation/scroll kono kichu hariye jay na.

   items: [{ key, html, hash? }]  — hash na dile protibar re-render
   dhore nibe (safe default); dile shudhu hash change hole re-render kore. */
function renderKeyedList(container, items, { emptyHtml = '' } = {}) {
  if (!container) return;

  const existingByKey = new Map();
  Array.from(container.children).forEach((child) => {
    const key = child.getAttribute('data-key');
    if (key) existingByKey.set(key, child);
  });

  if (!items || items.length === 0) {
    container.innerHTML = emptyHtml ? `<div data-empty-state="true">${emptyHtml}</div>` : '';
    return;
  }

  let prevNode = null; // ei item-er thik agei bosano node
  items.forEach((item) => {
    const key = String(item.key);
    const hash = item.hash != null ? String(item.hash) : null;
    let node = existingByKey.get(key);

    if (node) {
      existingByKey.delete(key);
      if (hash === null || node.getAttribute('data-hash') !== hash) {
        const fresh = htmlToElement(item.html);
        fresh.setAttribute('data-key', key);
        if (hash !== null) fresh.setAttribute('data-hash', hash);
        node.replaceWith(fresh);
        node = fresh;
      }
    } else {
      node = htmlToElement(item.html);
      node.setAttribute('data-key', key);
      if (hash !== null) node.setAttribute('data-hash', hash);
    }

    const expectedNext = prevNode ? prevNode.nextSibling : container.firstChild;
    if (expectedNext !== node) container.insertBefore(node, expectedNext);
    prevNode = node;
  });

  // ja ar list-e nei, shegulo shorao
  existingByKey.forEach((node) => node.remove());
}

function autoGrowTextarea(el, maxHeight = 96) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
}

export const Render = {
  mount, patch, scrollToBottom, renderKeyedList, autoGrowTextarea, htmlToElement,
};
