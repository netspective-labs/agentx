// lib/universal/fluent-ds-starter.ts
// Minimal starter design system using PicoCSS via CDN.
import {
  createDesignSystem,
  defineLayout,
  defineRegion,
  NamingStrategy,
  RenderCtx,
  slots,
} from "./fluent-ds.ts";
import * as h from "./fluent-html.ts";

type RenderInput = Record<PropertyKey, never>;

const picoCssUrl =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css";

const naming: NamingStrategy = {
  elemIdValue: (suggested, kind) => `${kind}-${suggested}`,
  elemDataAttr: (suggestedKeyName, _suggestedValue, _kind) =>
    `data-${suggestedKeyName}`,
  className: (suggested, kind) => `${kind}-${suggested}`,
};

export const starterMainRegion = defineRegion({
  name: "Main",
  slots: slots({
    required: ["title", "content"] as const,
    optional: ["lead"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) =>
    h.main(
      {
        class: ctx.cls("main"),
        id: ctx.naming.elemIdValue("main", "region"),
      },
      h.h1(s.title(ctx)),
      s.lead ? h.div({ class: ctx.cls("lead") }, s.lead(ctx)) : null,
      h.section({ class: ctx.cls("content") }, s.content(ctx)),
    ),
});

export const starterLayout = defineLayout({
  name: "Starter",
  slots: slots({
    required: ["title", "content"] as const,
    optional: ["lead"] as const,
  }),
  headSlots: slots({
    optional: ["title"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, api, s) =>
    h.section(
      {
        class: ctx.cls("shell"),
        id: ctx.naming.elemIdValue("shell", "layout"),
      },
      api.region("Main", {
        title: s.title,
        content: s.content,
        ...(s.lead ? { lead: s.lead } : {}),
      }),
    ),
});

export function starterDesignSystem(dsName = "starter-ds") {
  return createDesignSystem<RenderInput>(dsName, naming)
    .policies({ wrappers: { enabled: false } })
    .uaDependencies([
      {
        mountPoint: picoCssUrl,
        canonicalSource: picoCssUrl,
        mimeType: "text/css",
      },
    ])
    .region(starterMainRegion)
    .layout(starterLayout)
    .build();
}
