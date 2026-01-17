/**
 * @module lib/universal/fluent-html.ts
 *
 * A tiny, dependency-free “fluent HTML” builder for generating HTML strings on the server (and in tests),
 * without requiring `lib=dom`. It gives you:
 *
 * - A typed, ergonomic tag API: `div(...)`, `a(...)`, `table(...)`, etc.
 * - Safe-by-default escaping for text and attribute values.
 * - Controlled “raw HTML” escape hatches via `raw()` and `trustedRaw()`.
 * - A small set of compositional helpers (`attrs`, `classNames`, `styleText`, `each`, `children`).
 *
 * Output
 * - Tag functions return `RawHtml`, a small wrapper around a string intended to be safe to concatenate
 *   and return as an HTTP response body.
 * - The builder also carries an internal HTML AST per node (where possible) so `renderPretty()` can
 *   deterministically pretty-print without parsing HTML strings.
 *
 * Security model
 * - All plain string children are escaped with `escapeHtml`.
 * - All attribute values (except boolean attrs) are escaped with `escapeAttr`.
 * - `raw()` / `trustedRaw()` bypass escaping and should only be used with trusted content.
 * - `setRawPolicy({ mode: "dev-strict" })` can block `raw()` to catch accidental usage.
 *
 * Core concepts
 * - Attr values: `Attrs` is a simple `Record<string, string|number|boolean|null|undefined>`.
 *   - `true` emits a boolean attribute (`disabled`, `checked`, etc.).
 *   - `false` / `null` / `undefined` omit the attribute entirely.
 * - Children: `Child` is recursive and supports arrays and builder callbacks.
 *   - `null/undefined/false` are skipped.
 *   - `true` is skipped as a child (use boolean attrs for boolean semantics).
 *   - Arrays are flattened.
 *   - Builder callbacks are executed as the tree is walked.
 * - Void elements: tags like `img`, `br`, `meta` are emitted as `<tag ...>` without a closing tag.
 */

export type AttrValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type Attrs = Record<string, AttrValue>;

// Optional dev-time raw policy (defaults to permissive)
export type RawPolicy = {
  mode?: "permissive" | "dev-strict";
};

let rawPolicy: RawPolicy = { mode: "permissive" };

export function setRawPolicy(policy: RawPolicy): void {
  rawPolicy = { ...rawPolicy, ...policy };
}

/**
 * HTML AST used to support pretty rendering without parsing HTML.
 *
 * Notes:
 * - `text` is unescaped source text (escaped at render time).
 * - `raw` is a bypass escape hatch (verbatim HTML).
 * - `attrs` are stored in deterministic order at construction.
 */
export type HtmlAst =
  | { readonly kind: "fragment"; readonly children: readonly HtmlAst[] }
  | {
    readonly kind: "element";
    readonly tag: string;
    readonly attrs?: readonly [string, AttrValue | true][];
    readonly children?: readonly HtmlAst[];
    readonly void?: boolean;
  }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "raw"; readonly html: string }
  | { readonly kind: "comment"; readonly text: string }
  | { readonly kind: "doctype" };

/**
 * A safe-to-concatenate HTML string wrapper.
 * `__ast` is used by `renderPretty()` when available.
 */
export type RawHtml = { readonly __rawHtml: string; readonly __ast?: HtmlAst };

// Structural “DOM Node” shape, safe to reference without lib=dom.
export type DomNodeLike = { readonly nodeType: number };

// Builder support (usable anywhere a child can appear)
export type ChildAdder = (...children: Child[]) => void;
export type ChildBuilder = (e: ChildAdder) => void;

// A "Child" is recursive and can include builder functions.
export type Child =
  | string
  | number
  | boolean
  | null
  | undefined
  | RawHtml
  | DomNodeLike
  | Child[]
  | ChildBuilder;

export function trustedRaw(html: string, _hint?: string): RawHtml {
  return { __rawHtml: html, __ast: { kind: "raw", html } };
}

/**
 * Escape hatch that can be blocked in dev/test by policy.
 * Use for trusted, pre-escaped HTML snippets.
 */
export function raw(html: string, hint?: string): RawHtml {
  if (rawPolicy.mode === "dev-strict") {
    const msg = hint
      ? `raw() is blocked by dev-strict policy: ${hint}`
      : "raw() is blocked by dev-strict policy";
    throw new Error(msg);
  }
  return trustedRaw(html, hint);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value);
}

/**
 * Template tag for embedding text blocks as trusted raw HTML.
 *
 * The template literal must start with a blank first line. That line is
 * discarded. The remaining lines are dedented by the minimum common leading
 * indentation and returned as `trustedRaw`.
 *
 * This is intended for inline `<script>` usage where source readability matters
 * but deterministic output is required.
 *
 * There is an alias for function called `javaScript`.
 */
export function trustedRawFriendly(
  strings: TemplateStringsArray,
  ...exprs: unknown[]
): RawHtml {
  // Reconstruct full string with expressions interpolated
  let full = strings[0] ?? "";
  for (let i = 0; i < exprs.length; i++) {
    full += String(exprs[i]) + (strings[i + 1] ?? "");
  }

  // Normalize newlines
  full = full.replaceAll("\r\n", "\n");

  const lines = full.split("\n");

  // Enforce leading blank line
  if (lines.length === 0 || lines[0].trim() !== "") {
    throw new Error(
      "javaScript() template must start with a blank first line",
    );
  }

  // Drop the first (blank) line
  lines.shift();

  // Remove trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  // Compute minimum indentation
  let minIndent = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(/^(\s*)/);
    if (m) minIndent = Math.min(minIndent, m[1].length);
  }

  if (!Number.isFinite(minIndent)) minIndent = 0;

  // Dedent
  const dedented = lines
    .map((l) => (minIndent > 0 ? l.slice(minIndent) : l))
    .join("\n");

  return trustedRaw(dedented);
}

export const javaScript = trustedRawFriendly;

/**
 * Flattens children into a linear list of (string | RawHtml | DomNodeLike),
 * executing any builder callbacks as it walks the structure.
 *
 * Rules:
 * - null/undefined/false are skipped
 * - true is skipped (use boolean attrs for boolean semantics)
 * - arrays are recursively expanded
 * - builder functions are executed, and whatever they emit is recursively expanded
 * - RawHtml is passed through as-is
 * - DomNodeLike is passed through as-is (endpoint decides what to do)
 * - other primitives become strings
 */
export function flattenChildren(
  children: readonly Child[],
): (string | RawHtml | DomNodeLike)[] {
  const out: (string | RawHtml | DomNodeLike)[] = [];

  const visit = (c: Child): void => {
    if (c == null || c === false) return;

    // Builder callback
    if (typeof c === "function") {
      const emit: ChildAdder = (...xs) => {
        for (const x of xs) visit(x);
      };
      (c as ChildBuilder)(emit);
      return;
    }

    // Nested arrays
    if (Array.isArray(c)) {
      for (const x of c) visit(x);
      return;
    }

    // RawHtml passthrough
    if (typeof c === "object" && c && "__rawHtml" in c) {
      out.push(c as RawHtml);
      return;
    }

    // DomNodeLike passthrough
    if (typeof c === "object" && c && "nodeType" in c) {
      out.push(c as DomNodeLike);
      return;
    }

    // Skip boolean true as a child
    if (c === true) return;

    out.push(String(c));
  };

  for (const c of children) visit(c);
  return out;
}

export function serializeAttrs(attrs?: Attrs): string {
  if (!attrs) return "";

  const keys = Object.keys(attrs).sort();
  let s = "";
  for (const k of keys) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (v === true) {
      s += ` ${k}`;
      continue;
    }
    s += ` ${k}="${escapeAttr(String(v))}"`;
  }
  return s;
}

// DX helpers shared by server + client

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (value == null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function attrs(
  ...parts: Array<Attrs | null | undefined | false>
): Attrs {
  const out: Attrs = {};
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) out[k] = v;
  }
  return out;
}

export type ClassSpec =
  | string
  | null
  | undefined
  | false
  | ClassSpec[]
  | Record<string, boolean>;

export function classNames(...parts: ClassSpec[]): string {
  const out: string[] = [];
  const visit = (p: ClassSpec): void => {
    if (!p) return;
    if (Array.isArray(p)) {
      for (const x of p) visit(x);
      return;
    }
    if (typeof p === "object") {
      for (const [k, v] of Object.entries(p)) if (v) out.push(k);
      return;
    }
    const s = String(p).trim();
    if (s) out.push(s);
  };
  for (const p of parts) visit(p);
  return out.join(" ");
}

export const cls = classNames;

export function styleText(
  style: Record<string, string | number | null | undefined | false>,
): string {
  const toKebab = (s: string) =>
    s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

  const keys = Object.keys(style).sort();
  let s = "";
  for (const k of keys) {
    const v = style[k];
    if (v == null || v === false) continue;
    s += `${toKebab(k)}:${String(v)};`;
  }
  return s;
}

export const css = styleText;

// Explicit wrapper for readability in call sites.
export function children(builder: ChildBuilder): ChildBuilder {
  return builder;
}

export function each<T>(
  items: Iterable<T>,
  fn: (item: T, index: number) => Child,
): ChildBuilder {
  return (e) => {
    let i = 0;
    for (const it of items) e(fn(it, i++));
  };
}

// Minimal explicit type to satisfy "public API must have explicit type"
export type TagFn = (
  attrsOrChild?: Attrs | Child,
  ...children: Child[]
) => RawHtml;

const isAttrs = (v: unknown): v is Attrs => {
  if (!isPlainObject(v)) return false;
  if ("__rawHtml" in (v as Record<string, unknown>)) return false;
  if ("nodeType" in (v as Record<string, unknown>)) return false;
  return true;
};

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const isVoidElement = (t: string) => VOID_ELEMENTS.has(t.toLowerCase());

// AST helpers

function attrsToAst(a: Attrs): readonly [string, AttrValue | true][] {
  const keys = Object.keys(a).sort();
  const out: [string, AttrValue | true][] = [];
  for (const k of keys) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (v === true) out.push([k, true]);
    else out.push([k, v]);
  }
  return out;
}

function childrenToAst(children: readonly Child[]): HtmlAst[] {
  const flat = flattenChildren(children);
  const out: HtmlAst[] = [];

  for (const c of flat) {
    if (typeof c === "string") {
      out.push({ kind: "text", text: c });
      continue;
    }

    if (typeof c === "object" && c && "__rawHtml" in c) {
      const rh = c as RawHtml;
      out.push(rh.__ast ?? { kind: "raw", html: rh.__rawHtml });
      continue;
    }

    // Server renderer does not support DOM nodes
    if (typeof c === "object" && c && "nodeType" in c) {
      throw new Error("Fluent server error: DomNodeLike not supported here.");
    }

    throw new Error("Fluent server error: unsupported child type.");
  }

  return out;
}

function renderAstMinimized(node: HtmlAst): string {
  switch (node.kind) {
    case "fragment":
      return node.children.map(renderAstMinimized).join("");
    case "doctype":
      return "<!doctype html>";
    case "comment":
      return `<!--${escapeHtml(node.text)}-->`;
    case "raw":
      return node.html;
    case "text":
      return escapeHtml(node.text);
    case "element": {
      const attrs = node.attrs ?? [];
      let attrText = "";
      for (const [k, v] of attrs) {
        if (v === true) attrText += ` ${k}`;
        else attrText += ` ${k}="${escapeAttr(String(v))}"`;
      }

      if (node.void) return `<${node.tag}${attrText}>`;

      const inner = (node.children ?? []).map(renderAstMinimized).join("");
      return `<${node.tag}${attrText}>${inner}</${node.tag}>`;
    }
  }
}

function renderAstPretty(root: HtmlAst): string {
  const lines: string[] = [];
  const indentUnit = "  ";

  const isRawBlockTag = (t: string) => {
    const n = t.toLowerCase();
    return n === "script" || n === "style" || n === "pre" || n === "textarea";
  };

  const shouldInlineTextOnly = (n: Extract<HtmlAst, { kind: "element" }>) => {
    if (n.void) return true;
    const kids = n.children ?? [];
    if (kids.length === 0) return true;
    if (kids.length !== 1) return false;
    const only = kids[0];
    if (only.kind !== "text") return false;
    if (only.text.includes("\n")) return false;
    return only.text.trim().length <= 80;
  };

  const openTag = (n: Extract<HtmlAst, { kind: "element" }>) => {
    const attrs = n.attrs ?? [];
    let attrText = "";
    for (const [k, v] of attrs) {
      if (v === true) attrText += ` ${k}`;
      else attrText += ` ${k}="${escapeAttr(String(v))}"`;
    }
    return `<${n.tag}${attrText}>`;
  };

  const closeTag = (n: Extract<HtmlAst, { kind: "element" }>) => `</${n.tag}>`;

  const emit = (n: HtmlAst, depth: number) => {
    const pad = indentUnit.repeat(depth);

    switch (n.kind) {
      case "fragment":
        for (const c of n.children) emit(c, depth);
        return;

      case "doctype":
        lines.push(`${pad}<!doctype html>`);
        return;

      case "comment":
        lines.push(`${pad}<!--${escapeHtml(n.text)}-->`);
        return;

      case "raw": {
        const raw = n.html.replaceAll("\r\n", "\n");
        const rawLines = raw.split("\n");
        for (const rl of rawLines) lines.push(`${pad}${rl}`);
        return;
      }

      case "text":
        lines.push(`${pad}${escapeHtml(n.text)}`);
        return;

      case "element": {
        if (n.void) {
          lines.push(`${pad}${openTag(n)}`);
          return;
        }

        const kids = n.children ?? [];
        const tag = n.tag;

        if (kids.length === 0) {
          lines.push(`${pad}${openTag(n)}${closeTag(n)}`);
          return;
        }

        if (!isRawBlockTag(tag) && shouldInlineTextOnly(n)) {
          const only = kids[0] as Extract<HtmlAst, { kind: "text" }>;
          lines.push(
            `${pad}${openTag(n)}${escapeHtml(only.text)}${closeTag(n)}`,
          );
          return;
        }

        lines.push(`${pad}${openTag(n)}`);

        if (isRawBlockTag(tag)) {
          // keep inner lines verbatim (no trimming), just indent
          for (const c of kids) {
            if (c.kind === "text") {
              const raw = c.text.replaceAll("\r\n", "\n");
              for (const line of raw.split("\n")) {
                lines.push(`${pad}${indentUnit}${line}`);
              }
            } else if (c.kind === "raw") {
              const raw = c.html.replaceAll("\r\n", "\n");
              for (const line of raw.split("\n")) {
                lines.push(`${pad}${indentUnit}${line}`);
              }
            } else {
              emit(c, depth + 1);
            }
          }
        } else {
          for (const c of kids) emit(c, depth + 1);
        }

        lines.push(`${pad}${closeTag(n)}`);
        return;
      }
    }
  };

  emit(root, 0);
  return lines.length ? lines.join("\n") + "\n" : "";
}

// Internal primitive, intentionally not exported.
const el = (tag: string, ...args: unknown[]) => {
  let at: Attrs | undefined;
  let kids: Child[];

  if (args.length > 0 && isAttrs(args[0])) {
    at = args[0] as Attrs;
    kids = args.slice(1) as Child[];
  } else {
    kids = args as Child[];
  }

  const ast: HtmlAst = {
    kind: "element",
    tag,
    attrs: at ? attrsToAst(at) : undefined,
    void: isVoidElement(tag) ? true : undefined,
    children: isVoidElement(tag) ? undefined : childrenToAst(kids),
  };

  return { __rawHtml: renderAstMinimized(ast), __ast: ast } satisfies RawHtml;
};

const tag = (name: string): TagFn => (...args: unknown[]) =>
  el(name, ...(args as never[]));

// Convenience primitives
export const doctype: () => RawHtml = () => {
  const ast: HtmlAst = { kind: "doctype" };
  return { __rawHtml: renderAstMinimized(ast), __ast: ast };
};

export const comment: (s: string) => RawHtml = (s) => {
  const ast: HtmlAst = { kind: "comment", text: s };
  return { __rawHtml: renderAstMinimized(ast), __ast: ast };
};

// Render helpers for HTTP responses and tests
export type RenderMinimized = (...parts: Array<string | RawHtml>) => string;
export type RenderPretty = (...parts: Array<string | RawHtml>) => string;

// minimized: fastest, no layout guarantees
export const render: RenderMinimized = (...parts) =>
  parts.map((p) => (typeof p === "string" ? p : p.__rawHtml)).join("");

// pretty: deterministic, AST-based formatting (goldens, docs, etc.)
export const renderPretty: RenderPretty = (...parts) => {
  const astParts: HtmlAst[] = parts.map((p) => {
    if (typeof p === "string") return { kind: "raw", html: p };
    return p.__ast ?? { kind: "raw", html: p.__rawHtml };
  });
  return renderAstPretty({ kind: "fragment", children: astParts });
};

// Safer script/style helpers
export const scriptJs: (code: string, attrs?: Attrs) => RawHtml = (
  code,
  attrs,
) => script(attrs ?? {}, trustedRaw(code));

export const styleCss: (cssText: string, attrs?: Attrs) => RawHtml = (
  cssText,
  attrs,
) => style(attrs ?? {}, trustedRaw(cssText));

// Type-safe custom element tag helper (server)
export const customElement = (name: `${string}-${string}`): TagFn => tag(name);

// Full HTML tag set as named exports (no el export)
export const a: TagFn = tag("a");
export const abbr: TagFn = tag("abbr");
export const address: TagFn = tag("address");
export const area: TagFn = tag("area");
export const article: TagFn = tag("article");
export const aside: TagFn = tag("aside");
export const audio: TagFn = tag("audio");
export const b: TagFn = tag("b");
export const base: TagFn = tag("base");
export const bdi: TagFn = tag("bdi");
export const bdo: TagFn = tag("bdo");
export const blockquote: TagFn = tag("blockquote");
export const body: TagFn = tag("body");
export const br: TagFn = tag("br");
export const button: TagFn = tag("button");
export const canvas: TagFn = tag("canvas");
export const caption: TagFn = tag("caption");
export const cite: TagFn = tag("cite");
export const codeTag: TagFn = tag("code");
export const col: TagFn = tag("col");
export const colgroup: TagFn = tag("colgroup");
export const data: TagFn = tag("data");
export const datalist: TagFn = tag("datalist");
export const dd: TagFn = tag("dd");
export const del: TagFn = tag("del");
export const details: TagFn = tag("details");
export const dfn: TagFn = tag("dfn");
export const dialog: TagFn = tag("dialog");
export const div: TagFn = tag("div");
export const dl: TagFn = tag("dl");
export const dt: TagFn = tag("dt");
export const em: TagFn = tag("em");
export const embed: TagFn = tag("embed");
export const fieldset: TagFn = tag("fieldset");
export const figcaption: TagFn = tag("figcaption");
export const figure: TagFn = tag("figure");
export const footer: TagFn = tag("footer");
export const form: TagFn = tag("form");
export const h1: TagFn = tag("h1");
export const h2: TagFn = tag("h2");
export const h3: TagFn = tag("h3");
export const h4: TagFn = tag("h4");
export const h5: TagFn = tag("h5");
export const h6: TagFn = tag("h6");
export const head: TagFn = tag("head");
export const header: TagFn = tag("header");
export const hgroup: TagFn = tag("hgroup");
export const hr: TagFn = tag("hr");
export const html: TagFn = tag("html");
export const i: TagFn = tag("i");
export const iframe: TagFn = tag("iframe");
export const img: TagFn = tag("img");
export const input: TagFn = tag("input");
export const ins: TagFn = tag("ins");
export const kbd: TagFn = tag("kbd");
export const label: TagFn = tag("label");
export const legend: TagFn = tag("legend");
export const li: TagFn = tag("li");
export const link: TagFn = tag("link");
export const main: TagFn = tag("main");
export const map: TagFn = tag("map");
export const mark: TagFn = tag("mark");
export const menu: TagFn = tag("menu");
export const meta: TagFn = tag("meta");
export const meter: TagFn = tag("meter");
export const nav: TagFn = tag("nav");
export const noscript: TagFn = tag("noscript");
export const object: TagFn = tag("object");
export const ol: TagFn = tag("ol");
export const optgroup: TagFn = tag("optgroup");
export const option: TagFn = tag("option");
export const output: TagFn = tag("output");
export const p: TagFn = tag("p");
export const param: TagFn = tag("param");
export const picture: TagFn = tag("picture");
export const pre: TagFn = tag("pre");
export const progress: TagFn = tag("progress");
export const qTag: TagFn = tag("q");
export const rp: TagFn = tag("rp");
export const rt: TagFn = tag("rt");
export const ruby: TagFn = tag("ruby");
export const s: TagFn = tag("s");
export const samp: TagFn = tag("samp");
export const script: TagFn = tag("script");
export const search: TagFn = tag("search");
export const section: TagFn = tag("section");
export const select: TagFn = tag("select");
export const slot: TagFn = tag("slot");
export const small: TagFn = tag("small");
export const source: TagFn = tag("source");
export const span: TagFn = tag("span");
export const strong: TagFn = tag("strong");
export const style: TagFn = tag("style");
export const sub: TagFn = tag("sub");
export const summary: TagFn = tag("summary");
export const sup: TagFn = tag("sup");
export const table: TagFn = tag("table");
export const tbody: TagFn = tag("tbody");
export const td: TagFn = tag("td");
export const template: TagFn = tag("template");
export const textarea: TagFn = tag("textarea");
export const tfoot: TagFn = tag("tfoot");
export const th: TagFn = tag("th");
export const thead: TagFn = tag("thead");
export const time: TagFn = tag("time");
export const title: TagFn = tag("title");
export const tr: TagFn = tag("tr");
export const track: TagFn = tag("track");
export const u: TagFn = tag("u");
export const ul: TagFn = tag("ul");
export const varTag: TagFn = tag("var");
export const video: TagFn = tag("video");
export const wbr: TagFn = tag("wbr");
