# Natural DS

Natural DS is the canonical "Natural Design System" for Junxion UX. It is a
fully implemented design system built on the Natural HTML design-system runtime
(`lib/natural-html/design-system.ts`). If you have used design systems like
Material UI or Chakra UI, think of Natural DS as the reference implementation,
but expressed as pure TypeScript render functions that return HAST rather than
client-side components.

Natural DS is intentionally opinionated, but the underlying runtime is not.
Other design systems can be created that look completely different while
retaining the same typed layout/region/slot contract.

## What it provides

- A complete, production-grade layout system (`NaturalDoc`) and the ability to
  add your own as well.
- Regions for context headers, sidebars, breadcrumbs, main content, and toc
- Reusable components for navigation, content, and UI patterns
- Integrated CSS and UA dependencies, shipped as part of the design system

You get a cohesive UI without adopting Tailwind or any other CSS framework.

## Architecture summary

Natural DS is implemented as:

- A naming strategy (`naturalNaming`) for deterministic IDs and data attributes
- A design system factory (`naturalDesignSystem`) that registers regions/layouts
- A concrete layout (`NaturalDoc`) wired to regions and slots which serves as a
  production library but also as an example for you to create your own layouts
  in the future.
- A component library composed of pure render functions

Everything is server-rendered, deterministic, and type-safe.

## Key files

- `lib/natural-ds/design-system.ts`: design system factory and CSS/UA defaults
- `lib/natural-ds/layouts.ts`: canonical `NaturalDoc` layout
- `lib/natural-ds/region/*`: structural regions used by layouts
- `lib/natural-ds/component/*`: reusable UI components and patterns

## Usage

```ts
import { Application } from "../continuux/http.ts";
import {
  bodyText,
  naturalDesignSystem,
  navLink,
  navSection,
  pageHeader,
} from "./mod.ts";
import * as h from "../natural-html/elements.ts";
import { headSlots } from "../natural-html/patterns.ts";

const app = Application.sharedState({});
const ds = naturalDesignSystem();

const page = ds.page("NaturalDoc", {}, {
  slots: {
    sidebar: (ctx) =>
      navSection(ctx, {
        children: [
          navLink(ctx, { label: "Home", href: "#", active: true }),
          navLink(ctx, { label: "Docs", href: "#docs" }),
        ],
      }),
    breadcrumbs: () => h.span("Home / Docs"),
    content: (ctx) =>
      h.div(
        pageHeader(ctx, { title: "Natural DS", description: "Hello." }),
        bodyText(ctx, { content: "A typed, server-first design system." }),
      ),
  },
  headSlots: headSlots({
    title: "Natural DS Example",
    meta: [h.meta({ charset: "utf-8" })],
  }),
});

app.get("/", () =>
  new Response(h.render(page), {
    headers: { "content-type": "text/html; charset=utf-8" },
  }));
```

## When to use it

Use Natural DS when you want:

- A complete design system that is SSR-first and type-safe
- Integrated CSS without external frameworks
- A canonical, production-grade look and feel for enterprise micro-UIs

If you want a different visual language, build another DS on top of Natural
HTML. The runtime is designed to make that straightforward.
