# Natural HTML

Natural HTML is a tiny, functional HTML authoring library for TypeScript that
generates deterministic HTML without JSX, template strings, or DOM mutation. It
builds a HAST (Hypertext AST) tree and renders it to HTML, so your UI is
explicit, type-safe, and inspectable. If you have used hyperscript, tagged
templates, or JSX render functions, this will feel familiar, but more strict and
deterministic.

Natural HTML contains no server behavior. Rendering is pure functional
composition that emits HAST (and HTML downstream), so the same code works in
interactive or non-interactive contexts, with or without a browser DOM. It is
safe for static site generation, batch rendering, tests, and server responses.

Natural HTML is the foundation for Junxion UX server-rendered UI and the Natural
Design System runtime.

## Why it exists

Most TypeScript web stacks force you into a template DSL (JSX, Handlebars, etc.)
and then re-interpret the output at runtime. Natural HTML avoids that:

- No template DSLs or JSX transforms
- No DOM mutation for server rendering
- Deterministic output (sorted attributes, stable serialization)
- HAST output that is compatible with the unified / syntax-tree ecosystem

The result is HTML you can reason about, test exactly, and keep fully in
TypeScript.

## Core modules

### `elements.ts`

A dependency-free, type-safe HTML builder:

- Typed tag API for all standard HTML tags
- Explicit child model (strings are escaped, null/undefined dropped)
- Raw HTML insertion with policy controls for dev/test
- Deterministic attribute ordering for stable output
- Renderers for compact or pretty HTML

If you have used JSX, think of this as a pure-function renderer that produces
HAST instead of VDOM.

### `design-system.ts`

The Natural Design System runtime. It defines layouts, regions, slots, and
components as typed contracts so invalid UI states are unrepresentable. This is
similar in spirit to component composition frameworks, but without a runtime
component model or state management layer.

Key properties:

- Layouts and regions are compiled-time enforced structures
- Slots are exact, required/optional keys with runtime validation in dev
- Components are pure render functions that return HAST
- No hidden global registry or runtime mutation

### UA dependencies (integrated CSS and JS)

Natural HTML includes first-class modeling for user agent dependencies such as
CSS, JS modules, and fonts. Design systems declare these dependencies as data so
the server can expose routes and emit correct `<link>` and `<script>` tags.

This is how Natural DS and other systems can ship integrated CSS without
requiring Tailwind or external CSS libraries.

## How it fits in Junxion UX

Natural HTML is the "rendering substrate." _Continuux_ handles typed interaction
contracts and SSE. Natural DS (in `lib/natural-ds`) is the canonical design
system built on top of the Natural HTML runtime.

## Example

```ts
import * as h from "./elements.ts";

const page = h.render(
  h.doctype(),
  h.html(
    h.head(
      h.meta({ charset: "utf-8" }),
      h.title("Hello"),
    ),
    h.body(
      h.main({ class: "container" }, h.h1("Natural HTML")),
    ),
  ),
);
```

## When to use it

Use Natural HTML when you want:

- Pure TypeScript rendering without a template DSL
- Deterministic HTML for tests and AI-maintainable codebases
- A foundation for typed design systems with integrated CSS

If you need a client-side component framework, Natural HTML is not that. It is
purpose-built for server-rendered, type-safe UI delivery.
