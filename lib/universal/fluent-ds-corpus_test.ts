// lib/universal/fluent-ds-corpus_test.ts
import { assertEquals } from "@std/assert";
import * as h from "./fluent-html.ts";
import { corpusDesignSystem, docPageSlots } from "./fluent-ds-corpus.ts";
import { headSlots } from "./fluent-patterns.ts";

Deno.test("fluent-ds-corpus: doc page layout", () => {
  const ds = corpusDesignSystem();

  const slots = docPageSlots({
    title: () => h.span("Corpus DS"),
    content: () =>
      h.article(
        h.h1("Getting Started"),
        h.p("Corpus is a docs-first system for structured knowledge."),
        h.h2("Why Corpus"),
        h.p("Navigation, TOC, and metadata are first-class slots."),
      ),
    nav: {
      subjects: [
        { id: "core", label: "Core", href: "/docs" },
        { id: "labs", label: "Labs", href: "/labs" },
      ],
      trees: {
        core: [
          { label: "Getting Started", href: "/docs/getting-started" },
          {
            label: "Guides",
            children: [
              { label: "Installation", href: "/docs/install", active: true },
              { label: "Configuration", href: "/docs/config" },
            ],
          },
          { label: "API", href: "/docs/api" },
        ],
        labs: [
          { label: "Experiments", href: "/labs/experiments" },
          { label: "Prototypes", href: "/labs/prototypes" },
        ],
      },
      activeSubjectId: "core",
      subjectLabel: "Subject",
      navLabel: "Chapters",
      selectId: "corpus-subject",
    },
    toc: () =>
      h.ol(
        h.li(h.a({ href: "#why-corpus" }, "Why Corpus")),
        h.li(h.a({ href: "#slots" }, "Slots and semantics")),
      ),
    pageMeta: () => h.p(h.small("Updated: 2026-01-02")),
    globalNav: () =>
      h.ul(
        h.li(h.a({ href: "/docs" }, "Docs")),
        h.li(h.a({ href: "/api" }, "API")),
        h.li(h.a({ href: "/blog" }, "Blog")),
      ),
    searchBox: () => h.input({ type: "search", placeholder: "Search docs" }),
    footer: () => h.small("© 2026 Corpus DS"),
  });

  const page = h.renderPretty(
    ds.page("DocPage", {}, {
      slots,
      headSlots: headSlots({
        title: "Corpus DS",
      }),
    }),
  );

  assertEquals(
    page.trim(),
    `<!doctype html>
<html>
  <head>
    <link href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/@corpus-ds/client@0/dist/corpus.min.js" type="module"></script>
    <title>Corpus DS</title>
  </head>
  <body>
    <section class="layout-docs-shell" id="layout-shell">
      <header class="region-header" id="region-header">
        <div class="region-header__row">
          <div class="region-header__title"><span>Corpus DS</span></div>
          <nav class="region-header__global-nav">
            <ul>
              <li><a href="/docs">Docs</a></li>
              <li><a href="/api">API</a></li>
              <li><a href="/blog">Blog</a></li>
            </ul>
          </nav>
          <div class="region-header__search"><input placeholder="Search docs" type="search"></div>
        </div>
      </header>
      <main class="region-main" id="region-main">
        <div class="region-main__grid">
          <aside class="region-main__nav">
            <div class="region-main__subject">
              <div class="component-doc-subject" data-element-id="component-DocSubjectSelect"><label class="component-doc-subject__label" for="corpus-subject">Subject</label><select class="component-doc-subject__select" data-active-subject="core" id="corpus-subject"><option data-href="/docs" selected value="core">Core</option><option data-href="/labs" value="labs">Labs</option></select></div>
            </div>
            <div class="region-main__tree">
              <nav aria-label="Chapters" class="component-doc-tree" data-element-id="component-DocNavTree">
                <ul class="component-doc-tree__list component-doc-tree__list--d0">
                  <li class="component-doc-tree__item"><a class="component-doc-tree__link" href="/docs/getting-started">Getting Started</a></li>
                  <li class="component-doc-tree__item"><span class="component-doc-tree__label">Guides</span>
                    <ul class="component-doc-tree__list component-doc-tree__list--d1">
                      <li class="component-doc-tree__item component-doc-tree__item--active"><a class="component-doc-tree__link" href="/docs/install">Installation</a></li>
                      <li class="component-doc-tree__item"><a class="component-doc-tree__link" href="/docs/config">Configuration</a></li>
                    </ul>
                  </li>
                  <li class="component-doc-tree__item"><a class="component-doc-tree__link" href="/docs/api">API</a></li>
                </ul>
              </nav>
            </div>
          </aside>
          <section class="region-main__content">
            <article>
              <h1>Getting Started</h1>
              <p>Corpus is a docs-first system for structured knowledge.</p>
              <h2>Why Corpus</h2>
              <p>Navigation, TOC, and metadata are first-class slots.</p>
            </article>
            <div class="region-main__meta">
              <p><small>Updated: 2026-01-02</small></p>
            </div>
          </section>
          <aside class="region-main__toc">
            <div class="region-main__toc-title">On this page</div>
            <ol>
              <li><a href="#why-corpus">Why Corpus</a></li>
              <li><a href="#slots">Slots and semantics</a></li>
            </ol>
          </aside>
        </div>
      </main>
      <footer class="region-footer" id="region-footer"><small>© 2026 Corpus DS</small></footer>
    </section>
  </body>
</html>`,
  );
});
