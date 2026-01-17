/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// support/dx/hello/counter-ce.js
//
// Minimal <counter-ce>. CxAide owns sessionId, SSE, and POST wiring.
// This is the developer-expected usage: no manual EventSource or fetch boilerplate.

import { customElementAide } from "../../../lib/continuux/browser-ua-aide.js";

const tpl = document.createElement("template");
tpl.innerHTML = `
  <style>
    :host{display:block}
    .row{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.75rem}
    .count{font-size:2.2rem;margin:0}
    .muted{margin-top:1rem;color:var(--pico-muted-color)}
  </style>

  <p style="margin-bottom:.25rem;">Count</p>
  <p class="count"><strong id="count">0</strong></p>

  <div class="row">
    <button id="inc" type="button">Increment</button>
    <button id="reset" type="button" class="secondary">Reset</button>
  </div>

  <div id="status" class="muted"></div>
`;

export class CounterCe extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).append(tpl.content.cloneNode(true));
  }

  get #countEl() {
    return this.shadowRoot?.getElementById("count") ?? null;
  }
  get #statusEl() {
    return this.shadowRoot?.getElementById("status") ?? null;
  }
  get #incBtn() {
    return this.shadowRoot?.getElementById("inc") ?? null;
  }
  get #resetBtn() {
    return this.shadowRoot?.getElementById("reset") ?? null;
  }

  set count(v) {
    const el = this.#countEl;
    if (el) el.textContent = String(v);
  }
  set status(v) {
    const el = this.#statusEl;
    if (el) el.textContent = String(v ?? "");
  }

  connectedCallback() {
    const cx = this.cxAide; // provided by customElementAide (cached per element)
    if (!cx) {
      this.status = "missing cxAide";
      return;
    }

    // Typed-ish: event name strings match your SSE event map on the server.
    cx.on(
      "count",
      (d) => (this.count = d && typeof d.value === "number" ? d.value : 0),
    );
    cx.on(
      "status",
      (d) => (this.status = d && d.text != null ? String(d.text) : ""),
    );

    this.#incBtn?.addEventListener("click", () => this.#act("increment"));
    this.#resetBtn?.addEventListener("click", () => this.#act("reset"));

    this.status = "connecting…";
    cx.sseConnect(); // reads data-sse-url (+ sessionId auto) and opens EventSource
  }

  disconnectedCallback() {
    // Fine if used unwrapped; wrapper also disconnects.
    try {
      this.cxAide?.sseDisconnect?.();
    } catch {
      // ignore
    }
  }

  #act(action) {
    const cx = this.cxAide;
    if (!cx) return;

    this.status = `sending:${action}`;
    try {
      // Developer-expected: cx.action("increment") posts { action: "increment" }
      // to data-action-url, plus sessionId if your aide adds it.
      const p = cx.action(action);
      p?.catch?.((e) => (this.status = `error:${String(e?.message || e)}`));
    } catch (e) {
      this.status = `error:${String(e?.message || e)}`;
    }
  }
}

const aide = customElementAide(CounterCe, "counter-ce");

// Keep a single exported registration function for SSR boot scripts.
export const registerCounterCe = () => aide.register();
