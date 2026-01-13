// support/assurance/counter/public/counter-element.ts

import { button, div, span } from "../../../src/html/browser-ua/fluent.ts";
import { JunxionElement } from "../../../src/html/browser-ua/custom-element/base.ts";

type CounterState = {
  count: number;
};

export class JxCounter extends JunxionElement<CounterState> {
  static observedAttributes = ["count"];

  constructor() {
    super({ count: 0 }, { useShadow: true });
  }

  attributeChangedCallback(
    name: string,
    _oldV: string | null,
    newV: string | null,
  ) {
    if (name === "count") {
      const n = Number(newV ?? "0");
      if (!Number.isNaN(n)) this.setState({ count: n });
    }
  }

  override connectedCallback() {
    // Ensure host has SSE + swap config so runtime can auto-wire it.
    if (!this.hasAttribute("data-sse")) {
      this.setAttribute("data-sse", "/events");
    }
    if (!this.hasAttribute("data-target")) {
      this.setAttribute("data-target", "self");
    }
    if (!this.hasAttribute("data-swap")) {
      this.setAttribute("data-swap", "outer");
    }

    // hydrate state from attribute
    const n = Number(this.getAttribute("count") ?? "0");
    if (!Number.isNaN(n)) this.setState({ count: n });

    super.connectedCallback();
  }

  protected render(): Node {
    const count = this.state.count;

    // Click triggers fetch of a fragment. Server returns <jx-counter count="N"></jx-counter>
    const incBtn = button(
      {
        "data-on:click": `@post(${JSON.stringify("/inc")})`,
        "data-target": "closest:jx-counter",
        "data-swap": "outer",
      },
      "Increment",
    );

    return div(
      { class: "card" },
      div(
        { class: "row" },
        span({ class: "label" }, "Count: "),
        span({ class: "value" }, String(count)),
      ),
      div({ class: "row" }, incBtn),
      div(
        { class: "hint" },
        "SSE is enabled. Server can push updates as fragments.",
      ),
    );
  }
}

customElements.define("jx-counter", JxCounter);
