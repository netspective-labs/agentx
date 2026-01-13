// src/html/browser-ua/custom-element/base.ts
//
// Base class for JunxionUX custom elements.
// - Strongly typed state via generics
// - Deterministic rendering via a single render() method
// - Uses JunxionUX runtime enhance() to auto-wire data-* semantics
// - Closes SSE connections on disconnect
//
// Bundles to:
//   lib/html/browser-ua/custom-element/base.auto.js

import { closeSseIfPresent, enhance } from "../runtime.ts";

export type RenderTarget = ShadowRoot | HTMLElement;

export type JunxionElementOptions = {
  useShadow?: boolean;
};

export abstract class JunxionElement<S extends Record<string, unknown>>
  extends HTMLElement {
  #opts: JunxionElementOptions;
  #root: RenderTarget;
  #state: S;

  protected constructor(initialState: S, opts: JunxionElementOptions = {}) {
    super();
    this.#opts = { useShadow: true, ...opts };
    this.#root = this.#opts.useShadow
      ? this.attachShadow({ mode: "open" })
      : this;
    this.#state = initialState;
  }

  protected get state(): S {
    return this.#state;
  }

  protected setState(patch: Partial<S>) {
    // shallow merge by design
    this.#state = { ...this.#state, ...patch } as S;
    this.rerender();
  }

  protected get root(): RenderTarget {
    return this.#root;
  }

  connectedCallback() {
    this.rerender();
  }

  disconnectedCallback() {
    closeSseIfPresent(this);
  }

  protected rerender() {
    const n = this.render();
    if (n instanceof DocumentFragment) this.#root.replaceChildren(n);
    else this.#root.replaceChildren(n);

    // allow runtime to wire any data-on:* or data-sse attributes produced during render
    enhance({ root: this.#root });
  }

  // subclasses implement
  protected abstract render(): Node | DocumentFragment;
}
