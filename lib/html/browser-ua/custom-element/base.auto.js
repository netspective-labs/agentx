// src/html/browser-ua/runtime.ts
var DEFAULT_SWAP = "inner";
var isElement = (n) => n instanceof Element;
var parseAction = (expr) => {
  const m = expr.match(/^@([a-z]+)\((.*)\)\s*$/i);
  if (!m) return null;
  const method = m[1].toUpperCase();
  const arg = m[2].trim();
  try {
    const url = JSON.parse(arg);
    if (typeof url !== "string") return null;
    return {
      method,
      url
    };
  } catch {
    return null;
  }
};
var resolveTarget = (origin, spec) => {
  const s = (spec ?? "").trim();
  if (!s || s === "self") return origin;
  if (s.startsWith("closest:")) {
    const sel = s.slice("closest:".length).trim();
    const found2 = origin.closest(sel);
    if (found2) return found2;
    return origin;
  }
  if (s.startsWith("query:")) {
    const sel = s.slice("query:".length).trim();
    const found2 = origin.ownerDocument?.querySelector(sel);
    if (found2) return found2;
    return origin;
  }
  const found = origin.ownerDocument?.querySelector(s);
  return found ?? origin;
};
var swapFragment = (target, frag, mode) => {
  if (mode === "outer") {
    const parent = target.parentNode;
    if (!parent) return;
    parent.replaceChild(frag, target);
    return;
  }
  if (mode === "append") {
    target.appendChild(frag);
    return;
  }
  if (mode === "prepend") {
    target.insertBefore(frag, target.firstChild);
    return;
  }
  target.replaceChildren(frag);
};
var parseHtmlFragment = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.content;
};
var fetchAndSwap = async (origin, method, url) => {
  const targetSpec = origin.getAttribute("data-target");
  const swapSpec = origin.getAttribute("data-swap");
  const mode = swapSpec ?? DEFAULT_SWAP;
  const target = resolveTarget(origin, targetSpec);
  const res = await fetch(url, {
    method,
    headers: {
      "accept": "text/html"
    }
  });
  const html = await res.text();
  const frag = parseHtmlFragment(html);
  swapFragment(target, frag, mode);
  enhance({
    root: target.ownerDocument ?? document
  });
};
var wireOnHandlers = (root) => {
  const all = root.querySelectorAll?.("*");
  if (!all) return;
  for (const el of Array.from(all)) {
    if (!isElement(el)) continue;
    for (const attr of Array.from(el.attributes)) {
      if (!attr.name.startsWith("data-on:")) continue;
      const boundKey = `data-jx-bound:${attr.name}`;
      if (el.hasAttribute(boundKey)) continue;
      el.setAttribute(boundKey, "1");
      const eventName = attr.name.slice("data-on:".length);
      const action = parseAction(attr.value);
      if (!action) continue;
      el.addEventListener(eventName, (ev) => {
        if (eventName === "click") ev.preventDefault();
        fetchAndSwap(el, action.method, action.url).catch((e) => {
          console.error("[JunxionUX] action failed", e);
        });
      });
    }
  }
};
var wireSse = (root) => {
  const all = root.querySelectorAll?.("[data-sse]");
  if (!all) return;
  for (const el of Array.from(all)) {
    if (!isElement(el)) continue;
    const already = el.getAttribute("data-jx-sse");
    if (already === "1") continue;
    el.setAttribute("data-jx-sse", "1");
    const url = el.getAttribute("data-sse");
    if (!url) continue;
    const targetSpec = el.getAttribute("data-target");
    const swapSpec = el.getAttribute("data-swap");
    const mode = swapSpec ?? DEFAULT_SWAP;
    const target = resolveTarget(el, targetSpec);
    const es = new EventSource(url);
    const onFragment = (msg) => {
      const html = String(msg.data ?? "");
      const frag = parseHtmlFragment(html);
      swapFragment(target, frag, mode);
      enhance({
        root: target.ownerDocument ?? document
      });
    };
    es.addEventListener("fragment", onFragment);
    es.onmessage = onFragment;
    es.onerror = (e) => {
      console.warn("[JunxionUX] SSE error", e);
    };
    el.__jxSseHandle = {
      close: () => es.close()
    };
  }
};
var enhance = (opts = {}) => {
  const root = opts.root ?? document;
  wireOnHandlers(root);
  wireSse(root);
};
var closeSseIfPresent = (el) => {
  const h = el.__jxSseHandle;
  if (h?.close) h.close();
};

// src/html/browser-ua/custom-element/base.ts
var JunxionElement = class extends HTMLElement {
  #opts;
  #root;
  #state;
  constructor(initialState, opts = {}) {
    super();
    this.#opts = {
      useShadow: true,
      ...opts
    };
    this.#root = this.#opts.useShadow ? this.attachShadow({
      mode: "open"
    }) : this;
    this.#state = initialState;
  }
  get state() {
    return this.#state;
  }
  setState(patch) {
    this.#state = {
      ...this.#state,
      ...patch
    };
    this.rerender();
  }
  get root() {
    return this.#root;
  }
  connectedCallback() {
    this.rerender();
  }
  disconnectedCallback() {
    closeSseIfPresent(this);
  }
  rerender() {
    const n = this.render();
    if (n instanceof DocumentFragment) this.#root.replaceChildren(n);
    else this.#root.replaceChildren(n);
    enhance({
      root: this.#root
    });
  }
};
export {
  JunxionElement
};
