// src/html/browser-ua/runtime.ts
//
// JunxionUX browser runtime:
// - Auto-discovers declarative attributes and wires behavior
// - Supports fetch-based hypermedia actions via data-on:*="@get(...)" etc.
// - Supports SSE via data-sse="..." with fragment events
// - Supports fragment swapping via data-target + data-swap
//
// This module is intended to be bundled to:
//   lib/html/browser-ua/runtime.auto.js

export type SwapMode = "inner" | "outer" | "append" | "prepend";

export type EnhanceOptions = {
  root?: ParentNode;
};

const DEFAULT_SWAP: SwapMode = "inner";

const isElement = (n: unknown): n is Element => n instanceof Element;

const parseAction = (expr: string) => {
  // Supported:
  //   @get("..."), @post("..."), @put("..."), @patch("..."), @delete("...")
  //   argument is JSON string so it can be parsed with JSON.parse safely.
  const m = expr.match(/^@([a-z]+)\((.*)\)\s*$/i);
  if (!m) return null;
  const method = m[1].toUpperCase();
  const arg = m[2].trim();
  try {
    const url = JSON.parse(arg);
    if (typeof url !== "string") return null;
    return { method, url };
  } catch {
    return null;
  }
};

const resolveTarget = (origin: Element, spec?: string | null): Element => {
  const s = (spec ?? "").trim();
  if (!s || s === "self") return origin;

  if (s.startsWith("closest:")) {
    const sel = s.slice("closest:".length).trim();
    const found = origin.closest(sel);
    if (found) return found;
    return origin;
  }

  if (s.startsWith("query:")) {
    const sel = s.slice("query:".length).trim();
    const found = origin.ownerDocument?.querySelector(sel);
    if (found) return found;
    return origin;
  }

  // default: treat as selector in document
  const found = origin.ownerDocument?.querySelector(s);
  return found ?? origin;
};

const swapFragment = (
  target: Element,
  frag: DocumentFragment,
  mode: SwapMode,
) => {
  if (mode === "outer") {
    // Replace the target element itself with fragment nodes
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
  // inner
  target.replaceChildren(frag);
};

const parseHtmlFragment = (html: string): DocumentFragment => {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.content;
};

const fetchAndSwap = async (origin: Element, method: string, url: string) => {
  const targetSpec = origin.getAttribute("data-target");
  const swapSpec = origin.getAttribute("data-swap") as SwapMode | null;
  const mode: SwapMode = swapSpec ?? DEFAULT_SWAP;
  const target = resolveTarget(origin, targetSpec);

  const res = await fetch(url, {
    method,
    headers: {
      "accept": "text/html",
    },
  });

  const html = await res.text();
  const frag = parseHtmlFragment(html);
  swapFragment(target, frag, mode);
  enhance({ root: target.ownerDocument ?? document });
};

const wireOnHandlers = (root: ParentNode) => {
  const all = root.querySelectorAll?.("*");
  if (!all) return;

  for (const el of Array.from(all)) {
    if (!isElement(el)) continue;

    // Walk attributes for "data-on:*"
    for (const attr of Array.from(el.attributes)) {
      if (!attr.name.startsWith("data-on:")) continue;

      // Avoid double-binding
      const boundKey = `data-jx-bound:${attr.name}`;
      if (el.hasAttribute(boundKey)) continue;
      el.setAttribute(boundKey, "1");

      const eventName = attr.name.slice("data-on:".length);
      const action = parseAction(attr.value);
      if (!action) continue;

      el.addEventListener(eventName, (ev) => {
        // basic guard: if within a form submit, allow default; otherwise prevent navigation clicks
        if (eventName === "click") ev.preventDefault();
        fetchAndSwap(el, action.method, action.url).catch((e) => {
          // fail safe: log only
          console.error("[JunxionUX] action failed", e);
        });
      });
    }
  }
};

type SseHandle = { close: () => void };

const wireSse = (root: ParentNode) => {
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
    const swapSpec = el.getAttribute("data-swap") as SwapMode | null;
    const mode: SwapMode = swapSpec ?? DEFAULT_SWAP;
    const target = resolveTarget(el, targetSpec);

    const es = new EventSource(url);

    const onFragment = (msg: MessageEvent) => {
      const html = String(msg.data ?? "");
      const frag = parseHtmlFragment(html);
      swapFragment(target, frag, mode);
      enhance({ root: target.ownerDocument ?? document });
    };

    es.addEventListener("fragment", onFragment as EventListener);

    // Default message event also treated as fragment
    es.onmessage = onFragment;

    es.onerror = (e) => {
      console.warn("[JunxionUX] SSE error", e);
    };

    // Store handle so custom elements can close in disconnectedCallback if desired
    // deno-lint-ignore no-explicit-any
    (el as any).__jxSseHandle = { close: () => es.close() } satisfies SseHandle;
  }
};

export const enhance = (opts: EnhanceOptions = {}) => {
  const root = opts.root ?? document;
  wireOnHandlers(root);
  wireSse(root);
};

// Optional: custom element base can call this to close SSE connections.
export const closeSseIfPresent = (el: Element) => {
  // deno-lint-ignore no-explicit-any
  const h = (el as any).__jxSseHandle as SseHandle | undefined;
  if (h?.close) h.close();
};
