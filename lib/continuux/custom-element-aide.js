/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// lib/continuux/custom-element-aide.js
//
// A tiny helper for defining and instantiating Custom Elements with a stable,
// inspectable contract that can be extended by Continuux over time.
//
// - Accepts a class definition (constructor), not an instance.
// - Derives a kebab-case name from the class name unless you provide one.
// - Returns { name, ctor, instance(), register() }.
// - instance() is the single place we can enhance instances for Continuux
//   (SSE wiring, typed event buses, instrumentation, etc.) without changing
//   application call sites.

/**
 * @typedef {abstract new (...args: any[]) => HTMLElement} CustomElementCtor
 */

/**
 * @typedef {Object} CustomElementAideResult
 * @property {string} name Resolved custom element name (must contain a dash).
 * @property {CustomElementCtor} ctor The original constructor passed in.
 * @property {() => HTMLElement} instance Create an instance (and apply Continuux enhancements).
 * @property {() => HTMLElement} register Define the custom element if needed, then return a new instance.
 */

/**
 * Convert `MyWidgetThing` into `my-widget-thing`.
 * Keeps digits, collapses multiple dashes, trims.
 *
 * @param {string} s
 * @returns {string}
 */
function toKebabCase(s) {
  const raw = String(s || "").trim();
  const withDashes = raw
    // FooBar -> Foo-Bar
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    // ABCFoo -> ABC-Foo
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, "$1-$2")
    // spaces/underscores -> dashes
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

  return withDashes
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Ensure the name is a valid custom element name (must include a dash).
 * If not, prefix with "x-".
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeCustomElementName(name) {
  const n = toKebabCase(name);
  if (!n) return "x-element";
  if (n.includes("-")) return n;
  return `x-${n}`;
}

/**
 * Derive a stable element name from a constructor function/class.
 * Falls back to "x-element" if the class has no name.
 *
 * @param {CustomElementCtor} ctor
 * @returns {string}
 */
function deriveNameFromCtor(ctor) {
  // Function.name is stable for named class declarations.
  const n = /** @type {any} */ (ctor)?.name;
  return normalizeCustomElementName(typeof n === "string" ? n : "x-element");
}

/**
 * Placeholder for Continuux-specific instance enhancement.
 * Today it's a no-op. In the future, this is where we can:
 * - attach a typed event bus
 * - wire SSE session awareness
 * - apply diagnostics hooks
 * - standardize attribute parsing helpers
 *
 * Keep this deterministic and side-effect minimal.
 *
 * @param {HTMLElement} el
 * @param {{name: string, ctor: CustomElementCtor}} meta
 * @returns {HTMLElement}
 */
function enhanceInstanceForContinuux(el, meta) {
  // Example reserved hook point (do not rely on it in app code yet):
  // el.__cx ??= { name: meta.name };
  void meta;
  return el;
}

/**
 * Create a small factory around a Custom Element class.
 *
 * @param {CustomElementCtor} ctor A class definition extending HTMLElement.
 * @param {string=} name Optional explicit custom element tag name (e.g., "x-y").
 * @returns {CustomElementAideResult}
 */
export function customElementAide(ctor, name) {
  if (typeof ctor !== "function") {
    throw new TypeError("customElementAide: ctor must be a class/constructor");
  }

  const resolvedName = normalizeCustomElementName(
    typeof name === "string" && name.trim() ? name : deriveNameFromCtor(ctor),
  );

  /** @returns {HTMLElement} */
  const instance = () => {
    // Create the element via the registry if defined, otherwise via `new`.
    // Creating via document.createElement() ensures correct upgrade behavior
    // once defined, but requires the name. We support both paths deterministically.
    let el;
    try {
      if (
        typeof customElements !== "undefined" &&
        customElements.get(resolvedName)
      ) {
        el = /** @type {HTMLElement} */ (document.createElement(resolvedName));
      } else {
        el = new ctor();
      }
    } catch {
      // Fallback: attempt direct construction.
      el = new ctor();
    }

    return enhanceInstanceForContinuux(el, { name: resolvedName, ctor });
  };

  /** @returns {HTMLElement} */
  const register = () => {
    if (typeof customElements === "undefined") {
      throw new Error(
        "customElementAide.register: Custom Elements not available",
      );
    }

    const existing = customElements.get(resolvedName);
    if (!existing) {
      customElements.define(resolvedName, ctor);
    } else if (existing !== ctor) {
      // Avoid silent mismatches: registering the same name with a different ctor is a bug.
      throw new Error(
        `customElementAide.register: "${resolvedName}" is already defined with a different constructor`,
      );
    }

    // Per request: register() creates a new instance and returns it.
    return instance();
  };

  return /** @type {CustomElementAideResult} */ ({
    name: resolvedName,
    ctor,
    instance,
    register,
  });
}
