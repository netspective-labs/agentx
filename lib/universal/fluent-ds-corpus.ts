// lib/universal/fluent-ds-corpus.ts
// Corpus Design System: docs + knowledge base layouts/regions.
import {
  createDesignSystem,
  defineLayout,
  defineRegion,
  NamingStrategy,
  RenderCtx,
  SlotBuilder,
  slots,
} from "./fluent-ds.ts";
import * as h from "./fluent-html.ts";
import {
  DocNavSubject,
  docNavTree,
  DocNavTrees,
  docSubjectSelect,
  selectDocNavTree,
} from "./fluent-patterns.ts";

type RenderInput = Record<PropertyKey, never>;

const picoCssUrl =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css";
const corpusJsUrl =
  "https://cdn.jsdelivr.net/npm/@corpus-ds/client@0/dist/corpus.min.js";

const naming: NamingStrategy = {
  elemIdValue: (suggested, kind) => `${kind}-${suggested}`,
  elemDataAttr: (suggestedKeyName, _suggestedValue, _kind) =>
    `data-${suggestedKeyName}`,
  className: (suggested, kind) => `${kind}-${suggested}`,
};

function optionalSlots<
  Ctx extends object,
  N extends NamingStrategy,
  K extends string,
>(
  slots: Record<K, SlotBuilder<Ctx, N> | undefined>,
): Partial<Record<K, SlotBuilder<Ctx, N>>> {
  const out: Partial<Record<K, SlotBuilder<Ctx, N>>> = {};
  for (const key in slots) {
    const value = slots[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export type CorpusSidebarProps<Id extends string = string> = {
  readonly subjects: readonly DocNavSubject<Id>[];
  readonly trees: DocNavTrees<Id>;
  readonly activeSubjectId: Id;
  readonly subjectLabel?: string;
  readonly navLabel?: string;
  readonly selectId?: string;
};

export function corpusSidebar<
  Ctx extends object,
  NS extends NamingStrategy,
  Id extends string,
>(
  props: CorpusSidebarProps<Id>,
): {
  readonly navSubject: SlotBuilder<Ctx, NS>;
  readonly navTree: SlotBuilder<Ctx, NS>;
} {
  return {
    navSubject: (ctx) =>
      docSubjectSelect(ctx, {
        subjects: props.subjects,
        activeSubjectId: props.activeSubjectId,
        label: props.subjectLabel ?? "Subject",
        selectId: props.selectId,
      }),
    navTree: (ctx) =>
      docNavTree(ctx, {
        items: selectDocNavTree(props.trees, props.activeSubjectId),
        label: props.navLabel ?? "Sections",
      }),
  };
}

export type DocPageComposition<
  Ctx extends object,
  NS extends NamingStrategy,
  Id extends string = string,
> = {
  readonly title: SlotBuilder<Ctx, NS>;
  readonly content: SlotBuilder<Ctx, NS>;
  readonly nav: CorpusSidebarProps<Id>;
  readonly toc?: SlotBuilder<Ctx, NS>;
  readonly pageMeta?: SlotBuilder<Ctx, NS>;
  readonly globalNav?: SlotBuilder<Ctx, NS>;
  readonly searchBox?: SlotBuilder<Ctx, NS>;
  readonly footer?: SlotBuilder<Ctx, NS>;
};

export function docPageSlots<
  Ctx extends object,
  NS extends NamingStrategy,
  Id extends string,
>(
  input: DocPageComposition<Ctx, NS, Id>,
): {
  readonly title: SlotBuilder<Ctx, NS>;
  readonly navSubject: SlotBuilder<Ctx, NS>;
  readonly navTree: SlotBuilder<Ctx, NS>;
  readonly content: SlotBuilder<Ctx, NS>;
  readonly toc?: SlotBuilder<Ctx, NS>;
  readonly pageMeta?: SlotBuilder<Ctx, NS>;
  readonly globalNav?: SlotBuilder<Ctx, NS>;
  readonly searchBox?: SlotBuilder<Ctx, NS>;
  readonly footer?: SlotBuilder<Ctx, NS>;
} {
  const sidebar = corpusSidebar<Ctx, NS, Id>(input.nav);
  return {
    title: input.title,
    navSubject: sidebar.navSubject,
    navTree: sidebar.navTree,
    content: input.content,
    toc: input.toc,
    pageMeta: input.pageMeta,
    globalNav: input.globalNav,
    searchBox: input.searchBox,
    footer: input.footer,
  };
}

export const corpusHeaderRegion = defineRegion({
  name: "Header",
  slots: slots({
    required: ["title"] as const,
    optional: ["globalNav", "searchBox"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) => {
    const elementId = ctx.naming.elemIdValue("header", "region");
    return h.header(
      h.attrs({ id: elementId }, { class: ctx.cls("header") }),
      h.div(
        { class: ctx.cls("header__row") },
        h.div({ class: ctx.cls("header__title") }, s.title(ctx)),
        s.globalNav
          ? h.nav({ class: ctx.cls("header__global-nav") }, s.globalNav(ctx))
          : null,
        s.searchBox
          ? h.div({ class: ctx.cls("header__search") }, s.searchBox(ctx))
          : null,
      ),
    );
  },
});

export const corpusMainRegion = defineRegion({
  name: "Main",
  slots: slots({
    required: ["navSubject", "navTree", "content"] as const,
    optional: ["toc", "pageMeta"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) => {
    const elementId = ctx.naming.elemIdValue("main", "region");
    return h.main(
      h.attrs({ id: elementId }, { class: ctx.cls("main") }),
      h.div(
        { class: ctx.cls("main__grid") },
        h.aside(
          { class: ctx.cls("main__nav") },
          h.div({ class: ctx.cls("main__subject") }, s.navSubject(ctx)),
          h.div({ class: ctx.cls("main__tree") }, s.navTree(ctx)),
        ),
        h.section(
          { class: ctx.cls("main__content") },
          s.content(ctx),
          s.pageMeta
            ? h.div({ class: ctx.cls("main__meta") }, s.pageMeta(ctx))
            : null,
        ),
        s.toc
          ? h.aside(
            { class: ctx.cls("main__toc") },
            h.div({ class: ctx.cls("main__toc-title") }, "On this page"),
            s.toc(ctx),
          )
          : null,
      ),
    );
  },
});

export const corpusFooterRegion = defineRegion({
  name: "Footer",
  slots: slots({
    optional: ["content"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) => {
    const elementId = ctx.naming.elemIdValue("footer", "region");
    return h.footer(
      h.attrs({ id: elementId }, { class: ctx.cls("footer") }),
      s.content ? s.content(ctx) : null,
    );
  },
});

export const docsShellLayout = defineLayout({
  name: "DocsShell",
  slots: slots({
    required: ["title", "navSubject", "navTree", "content"] as const,
    optional: ["toc", "pageMeta", "globalNav", "searchBox", "footer"] as const,
  }),
  headSlots: slots({
    optional: ["title", "head"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, api, s) =>
    h.section(
      {
        class: ctx.cls("docs-shell"),
        id: ctx.naming.elemIdValue("shell", "layout"),
      },
      api.region(
        "Header",
        optionalSlots({
          title: s.title,
          globalNav: s.globalNav,
          searchBox: s.searchBox,
        }),
      ),
      api.region(
        "Main",
        optionalSlots({
          navSubject: s.navSubject,
          navTree: s.navTree,
          content: s.content,
          toc: s.toc,
          pageMeta: s.pageMeta,
        }),
      ),
      api.region("Footer", optionalSlots({ content: s.footer })),
    ),
});

export const docPageLayout = defineLayout({
  name: "DocPage",
  slots: slots({
    required: ["title", "navSubject", "navTree", "content"] as const,
    optional: ["toc", "pageMeta", "globalNav", "searchBox", "footer"] as const,
  }),
  headSlots: slots({
    optional: ["title", "head"] as const,
  }),
  render: (_ctx, api, s) =>
    api.layout(
      "DocsShell",
      optionalSlots({
        title: s.title,
        navSubject: s.navSubject,
        navTree: s.navTree,
        content: s.content,
        toc: s.toc,
        pageMeta: s.pageMeta,
        globalNav: s.globalNav,
        searchBox: s.searchBox,
        footer: s.footer,
      }),
    ),
});

export const docLandingLayout = defineLayout({
  name: "DocLanding",
  slots: slots({
    required: ["title", "hero", "sections"] as const,
    optional: ["globalNav", "searchBox", "featured", "footer"] as const,
  }),
  headSlots: slots({
    optional: ["title", "head"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, api, s) =>
    h.section(
      {
        class: ctx.cls("landing"),
        id: ctx.naming.elemIdValue("landing", "layout"),
      },
      api.region(
        "Header",
        optionalSlots({
          title: s.title,
          globalNav: s.globalNav,
          searchBox: s.searchBox,
        }),
      ),
      h.main(
        { class: ctx.cls("landing__main") },
        h.section({ class: ctx.cls("landing__hero") }, s.hero(ctx)),
        s.featured
          ? h.section({ class: ctx.cls("landing__featured") }, s.featured(ctx))
          : null,
        h.section({ class: ctx.cls("landing__sections") }, s.sections(ctx)),
      ),
      api.region("Footer", optionalSlots({ content: s.footer })),
    ),
});

export function corpusDesignSystem(dsName = "corpus-ds") {
  return createDesignSystem<RenderInput>(dsName, naming)
    .policies({ wrappers: { enabled: false } })
    .uaDependencies([
      {
        mountPoint: picoCssUrl,
        canonicalSource: picoCssUrl,
        mimeType: "text/css",
      },
      {
        mountPoint: corpusJsUrl,
        canonicalSource: corpusJsUrl,
        mimeType: "application/javascript",
        as: "module",
      },
    ])
    .region(corpusHeaderRegion)
    .region(corpusMainRegion)
    .region(corpusFooterRegion)
    .layout(docsShellLayout)
    .layout(docPageLayout)
    .layout(docLandingLayout)
    .build();
}
