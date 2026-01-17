/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/**
 * lib/continuux/interaction-browser-ua.js
 *
 * This module is the browser-side runtime that implements the ContinuUX
 * interactivity contract defined by `lib/continuux/interaction.ts`,
 * `lib/continuux/interaction-html.ts`, and wired server-side via
 * `lib/continuux/http.ts` (Fetch router + SSE primitives).
 *
 * It plays the same role HTMX or Datastar play in a hypermedia-first system:
 * it observes DOM events, finds declarative interaction metadata in the DOM,
 * posts a structured request back to the server, and applies server-directed
 * instructions. The difference is that ContinuUX uses a typed interaction
 * envelope and a small action spec DSL, and the server may respond by pushing
 * JavaScript instructions over SSE rather than relying on client-side state
 * management.
 *
 * Contract (DOM + network)
 * - Interaction attributes are `data-cx-*` (prefix configurable):
 *   - `data-cx="SPEC"` is the fallback action spec
 *   - `data-cx-on-click="SPEC"`, `data-cx-on-submit="SPEC"`, etc. bind per-event specs
 *   - `data-cx-id="stable-id"` optional correlation id for the element
 *   - `data-cx-signals='{"k":"v"}'` optional JSON context to include in the envelope
 *   - `data-cx-headers='{"X-Foo":"bar"}'` optional per-interaction headers metadata
 *
 * - SSE bus attributes are also read from the DOM root (`<html>` or `<body>`):
 *   - `data-cx-sse-url="/cx/sse"` optional SSE endpoint override
 *   - `data-cx-sse-with-credentials="true|false"` optional EventSource credential override
 *
 * Behavior
 * - Delegated event listeners (capture phase) watch a configured set of DOM events.
 * - For each event, the UA walks up from `event.target` to find the closest element
 *   carrying an action spec (per-event attribute or fallback `data-cx`).
 * - It builds a structured interaction envelope that includes:
 *   - domEvent + spec
 *   - element metadata (tag/id/name/class/role/cxId)
 *   - client metadata (sessionId/requestId/navigation context/timestamp/appVersion)
 *   - optional pointer/key/input/form data when available
 *   - optional signals and headers JSON parsed from attributes
 * - It POSTs the envelope as JSON to `postUrl` (default `/cx`) and includes correlation
 *   headers (`x-cx-session`, `x-cx-request`) for observability.
 *
 * SSE and server-directed instructions
 * - The UA maintains an EventSource connection to `sseUrl` (default `/cx/sse`) and
 *   appends `?sessionId=...` so the server can address the session.
 * - The UA listens for an SSE event (default name `"js"`) whose payload is treated
 *   as executable JavaScript and evaluated in page context.
 * - This is the primary continuity channel for server-to-client “instructions”.
 *   The server should treat JS emission as privileged, deterministic, and strictly
 *   controlled.
 *
 * Diagnostics
 * - When `diagnostics` is enabled, the UA emits machine-readable console lines with
 *   prefix `[cx:diag]` that tests and tools can parse to understand posts, SSE
 *   lifecycle events, and JS execution outcomes.
 *
 * Scope and positioning
 * - This runtime is intentionally small, direct, and easy to reason about.
 * - It is not currently tuned for maximum performance or minimum bundle size.
 *   The target is small to medium sized microservice-oriented web UIs where
 *   determinism, inspectability, and typed server-client continuity matter more
 *   than the optimizations required for high-scale public websites.
 *
 * Security expectations
 * - The UA does not enforce security policy. The server must enforce authn/authz,
 *   origin/CSRF policy, envelope validation, and any signing or rate limiting.
 * - Treat the SSE `"js"` channel as privileged and validate the conditions under
 *   which the server emits executable instructions.
 *
 * Public API
 * - `createCxUserAgent(config?)` returns a `CxUserAgent` with:
 *   - `sessionId` stable-ish per browser (localStorage backed when possible)
 *   - `connect()` / `disconnect()` SSE lifecycle controls
 *   - `post(spec, domEvent?, el?)` to synthesize a client->server interaction
 *   - `wire()` to attach listeners (called automatically on init)
 *   - `exec(jsText)` to execute JS (used by SSE handler)
 */

/**
 * @typedef {"click"|"dblclick"|"submit"|"change"|"input"|"keydown"|"keyup"|"focusin"|"focusout"|"pointerdown"|"pointerup"} CxDomEventName
 */

/**
 * @typedef {Object} CxUserAgentConfig
 * @property {string=} postUrl POST endpoint receiving interaction envelopes (default "/cx")
 * @property {string=} sseUrl SSE endpoint (default "/cx/sse")
 * @property {boolean=} sseWithCredentials Whether EventSource uses credentials (default true)
 * @property {boolean=} autoConnect Whether to auto-connect SSE (default true)
 * @property {CxDomEventName[]=} events DOM events to listen to (default common set)
 * @property {boolean=} debug Whether to log debug output (default false)
 * @property {boolean=} diagnostics Whether to emit machine-readable diagnostics to console (default false)
 * @property {string=} attrPrefix Attribute prefix (default "data-cx")
 * @property {string=} sseJsEventName SSE event name that carries JS (default "js")
 * @property {string=} appVersion Optional app version tag
 * @property {boolean=} preventDefaultSubmit Prevent default on submit (default true)
 */

/**
 * @typedef {Object} CxUserAgent
 * @property {string} sessionId Stable-ish session id (localStorage backed when possible)
 * @property {CxUserAgentConfig} config Normalized config
 * @property {() => void} connect Open SSE if not already connected
 * @property {() => void} disconnect Close SSE if open
 * @property {(spec: string, domEvent?: CxDomEventName, el?: Element | null) => Promise<void>} post Send a synthetic interaction envelope
 * @property {() => void} wire Attach event delegation listeners
 * @property {(jsText: string) => void} exec Execute JS (used for SSE)
 */

export const CX_DIAG_PREFIX = "[cx:diag]";

/**
 * Factory: creates the CX browser user agent object.
 *
 * @param {CxUserAgentConfig=} cfg
 * @returns {CxUserAgent}
 */
export function createCxUserAgent(cfg = {}) {
  const c = normalizeConfig(cfg);

  const log = (...args) => {
    if (!c.debug) return;
    try {
      // eslint-disable-next-line no-console
      console.log(...args);
    } catch {
      // ignore
    }
  };

  const diag = (kind, data = {}) => {
    if (!c.diagnostics) return;
    try {
      // eslint-disable-next-line no-console
      console.log(
        CX_DIAG_PREFIX,
        JSON.stringify({ kind, ts: Date.now(), data }),
      );
    } catch {
      // ignore
    }
  };

  const uuid = () => {
    try {
      return globalThis.crypto?.randomUUID?.() ??
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    } catch {
      return `${Date.now().toString(36)}-${
        Math.random().toString(36).slice(2)
      }`;
    }
  };

  const sessionId = (() => {
    try {
      const k = "cx:sessionId";
      let v = localStorage.getItem(k);
      if (!v) {
        v = uuid();
        localStorage.setItem(k, v);
      }
      return v;
    } catch {
      return uuid();
    }
  })();

  const attrName = (suffix) => c.attrPrefix + (suffix ? `-${suffix}` : "");

  const getAttr = (el, name) => {
    try {
      return el.getAttribute(name);
    } catch {
      return null;
    }
  };

  const parseJsonAttr = (el, name) => {
    const t = getAttr(el, name);
    if (!t) return undefined;
    try {
      return JSON.parse(t);
    } catch {
      return undefined;
    }
  };

  const findCxTarget = (start, domEvent) => {
    let el = start;
    const onName = attrName(`on-${domEvent}`);
    const baseName = attrName("");
    while (el && el !== document.documentElement) {
      if (el.nodeType === 1) {
        const spec = getAttr(el, onName) || getAttr(el, baseName);
        if (spec) return { el, spec };
      }
      el = el.parentElement;
    }
    return null;
  };

  const formToObject = (form) => {
    try {
      const fd = new FormData(form);
      /** @type {Record<string, string|string[]>} */
      const out = {};
      fd.forEach((v, k) => {
        const sv = typeof v === "string" ? v : (v?.name ? v.name : String(v));
        if (out[k] === undefined) out[k] = sv;
        else if (Array.isArray(out[k])) out[k].push(sv);
        else out[k] = [out[k], sv];
      });
      return out;
    } catch {
      return undefined;
    }
  };

  const elementMeta = (el) => {
    try {
      return {
        tag: (el.tagName || "").toLowerCase(),
        id: el.id || undefined,
        name: el.getAttribute?.("name") || undefined,
        className: el.className || undefined,
        role: el.getAttribute?.("role") ?? null,
        cxId: el.getAttribute?.(attrName("id")) || undefined,
      };
    } catch {
      return { tag: "unknown" };
    }
  };

  const clientMeta = (requestId) => {
    const loc = window.location;
    return {
      sessionId,
      requestId,
      userAgent: navigator?.userAgent || undefined,
      href: String(loc.href),
      pathname: String(loc.pathname),
      search: String(loc.search || ""),
      referrer: document?.referrer ? String(document.referrer) : undefined,
      ts: Date.now(),
      appVersion: c.appVersion || undefined,
    };
  };

  const envelope = (domEvent, spec, el, ev) => {
    const requestId = uuid();
    /** @type {any} */
    const env = {
      kind: "cx/interaction",
      domEvent,
      spec: String(spec),
      element: elementMeta(el),
      client: clientMeta(requestId),
    };

    const signals = parseJsonAttr(el, attrName("signals"));
    if (signals && typeof signals === "object") env.signals = signals;

    const headers = parseJsonAttr(el, attrName("headers"));
    if (headers && typeof headers === "object") env.headers = headers;

    try {
      if (
        ev && typeof ev.clientX === "number" && typeof ev.clientY === "number"
      ) {
        env.pointer = {
          x: ev.clientX,
          y: ev.clientY,
          button: ev.button,
          buttons: ev.buttons,
        };
      }
    } catch {
      // ignore
    }

    try {
      if (ev && typeof ev.key === "string") {
        env.key = {
          key: ev.key,
          code: ev.code,
          altKey: !!ev.altKey,
          ctrlKey: !!ev.ctrlKey,
          metaKey: !!ev.metaKey,
          shiftKey: !!ev.shiftKey,
          repeat: !!ev.repeat,
        };
      }
    } catch {
      // ignore
    }

    try {
      const t = ev?.target;
      if (t && t.nodeType === 1) {
        if ("value" in t) env.input = { value: String(t.value) };
        if ("checked" in t) {
          env.input ??= {};
          env.input.checked = !!t.checked;
        }
      }
    } catch {
      // ignore
    }

    try {
      if (domEvent === "submit") {
        let f = el;
        if (f?.tagName?.toLowerCase() !== "form") {
          let p = f;
          while (p?.tagName?.toLowerCase() !== "form") p = p.parentElement;
          f = p;
        }
        if (f?.tagName?.toLowerCase() === "form") env.form = formToObject(f);
      }
    } catch {
      // ignore
    }

    return env;
  };

  const resolveSseUrl = () => {
    let url = c.sseUrl;
    try {
      const root = document.documentElement || document.body;
      const override = root?.getAttribute?.(attrName("sse-url"));
      if (override) url = override;
    } catch {
      // ignore
    }
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}sessionId=${encodeURIComponent(sessionId)}`;
  };

  const resolveSseWithCredentials = () => {
    let v = c.sseWithCredentials;
    try {
      const root = document.documentElement || document.body;
      const o = root?.getAttribute?.(attrName("sse-with-credentials"));
      if (o === "false") v = false;
      if (o === "true") v = true;
    } catch {
      // ignore
    }
    return v;
  };

  const readTextLimited = async (res, limit = 2000) => {
    try {
      const t = await res.text();
      if (!t) return "";
      return t.length > limit ? t.slice(0, limit) + "…" : t;
    } catch {
      return "";
    }
  };

  const postEnvelope = async (env) => {
    /** @type {Record<string, string>} */
    const headers = { "content-type": "application/json" };
    try {
      headers["x-cx-session"] = env.client.sessionId;
      headers["x-cx-request"] = env.client.requestId;
    } catch {
      // ignore
    }

    diag("post:begin", {
      url: c.postUrl,
      domEvent: env.domEvent,
      spec: env.spec,
      requestId: env?.client?.requestId,
    });

    log("[cx] -> post", c.postUrl, env);

    try {
      const res = await fetch(c.postUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(env),
        credentials: "include",
        keepalive: true,
      });

      if (!res.ok) {
        const errText = await readTextLimited(res);
        diag("post:end", {
          ok: false,
          status: res.status,
          statusText: res.statusText || "",
          errorText: errText || "",
          domEvent: env.domEvent,
          spec: env.spec,
          requestId: env?.client?.requestId,
        });
        log("[cx] post non-2xx", res.status, res.statusText, errText);
        return;
      }

      diag("post:end", {
        ok: true,
        status: res.status,
        domEvent: env.domEvent,
        spec: env.spec,
        requestId: env?.client?.requestId,
      });
    } catch (err) {
      diag("post:end", {
        ok: false,
        status: 0,
        statusText: "fetch_error",
        errorText: String(err && (err.stack || err.message || err)) || "",
        domEvent: env.domEvent,
        spec: env.spec,
        requestId: env?.client?.requestId,
      });
      log("[cx] post error", err);
    }
  };

  const safeExec = (jsText) => {
    diag("exec:begin", { bytes: String(jsText ?? "").length });
    try {
      (0, Function)(String(jsText))();
      diag("exec:end", { ok: true });
    } catch (err) {
      diag("exec:end", {
        ok: false,
        error: String(err && (err.stack || err.message || err)),
      });
      log("[cx] js exec error", err);
    }
  };

  /** @type {EventSource|null} */
  let es = null;

  const connectSse = () => {
    if (es) return;

    const full = resolveSseUrl();
    const withCreds = resolveSseWithCredentials();
    diag("sse:connect", { url: full, withCredentials: withCreds });
    log("[cx] SSE connect", full, "withCredentials=", withCreds);

    try {
      es = new EventSource(full, { withCredentials: withCreds });
    } catch (err) {
      es = null;
      diag("sse:init_error", {
        error: String(err && (err.stack || err.message || err)),
      });
      log("[cx] SSE init error", err);
      return;
    }

    try {
      es.addEventListener("open", () => {
        diag("sse:open", {});
      });
    } catch {
      // ignore
    }

    es.addEventListener(c.sseJsEventName, (ev) => {
      try {
        diag("sse:js", { bytes: String(ev?.data ?? "").length });
        safeExec(ev.data);
      } catch {
        // ignore
      }
    });

    es.addEventListener("error", () => {
      diag("sse:error", {});
      log("[cx] SSE error");
    });
  };

  const disconnectSse = () => {
    if (!es) return;
    try {
      es.close();
    } catch {
      // ignore
    }
    es = null;
    diag("sse:close", {});
  };

  const handleEvent = (domEvent, ev) => {
    const t = ev?.target;
    if (!t || t.nodeType !== 1) {
      diag("dom:ignore", { domEvent, reason: "no_target" });
      return;
    }

    const found = findCxTarget(t, domEvent);
    if (!found) {
      diag("dom:ignore", { domEvent, reason: "no_spec" });
      return;
    }

    diag("dom:target", {
      domEvent,
      spec: String(found.spec),
      tag: String(found.el?.tagName || "").toLowerCase(),
    });

    try {
      if (domEvent === "submit" && c.preventDefaultSubmit) ev.preventDefault();

      if (domEvent === "click") {
        const el = found.el;
        if (el?.tagName?.toLowerCase() === "a" && el.getAttribute("href")) {
          ev.preventDefault();
        }
      }
    } catch {
      // ignore
    }

    connectSse();
    void postEnvelope(envelope(domEvent, found.spec, found.el, ev));
  };

  let wired = false;

  const wire = () => {
    if (wired) return;
    wired = true;

    diag("wire:begin", { events: c.events.slice() });

    for (const name of c.events) {
      document.addEventListener(name, (ev) => handleEvent(name, ev), true);
    }

    window.addEventListener("beforeunload", () => disconnectSse());

    diag("wire:end", {});
  };

  // start
  wire();
  if (c.autoConnect) connectSse();

  diag("init", {
    sessionId,
    postUrl: c.postUrl,
    sseUrl: c.sseUrl,
    diagnostics: !!c.diagnostics,
  });

  return {
    sessionId,
    config: c,
    connect: connectSse,
    disconnect: disconnectSse,
    post: async (spec, domEvent = "click", el = document.documentElement) => {
      connectSse();
      void postEnvelope(envelope(domEvent, spec, el, null));
    },
    wire,
    exec: safeExec,
  };
}

/** @param {CxUserAgentConfig} cfg */
function normalizeConfig(cfg) {
  const events = (cfg.events && cfg.events.length)
    ? cfg.events.slice()
    : /** @type {CxDomEventName[]} */ ([
      "click",
      "submit",
      "change",
      "input",
      "keydown",
    ]);

  return /** @type {CxUserAgentConfig} */ ({
    postUrl: cfg.postUrl || "/cx",
    sseUrl: cfg.sseUrl || "/cx/sse",
    sseWithCredentials: typeof cfg.sseWithCredentials === "boolean"
      ? cfg.sseWithCredentials
      : true,
    autoConnect: typeof cfg.autoConnect === "boolean" ? cfg.autoConnect : true,
    debug: !!cfg.debug,
    diagnostics: !!cfg.diagnostics,
    attrPrefix: cfg.attrPrefix || "data-cx",
    sseJsEventName: cfg.sseJsEventName || "js",
    appVersion: cfg.appVersion || "",
    preventDefaultSubmit: typeof cfg.preventDefaultSubmit === "boolean"
      ? cfg.preventDefaultSubmit
      : true,
    events,
  });
}
