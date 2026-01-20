// lib/universal/fluent-ds-starter_test.ts
import { assertEquals } from "@std/assert";
import { starterDesignSystem } from "./fluent-ds-starter.ts";
import * as h from "./fluent-html.ts";

Deno.test("fluent-ds-starter: minimal body-only ds", () => {
  const ds = starterDesignSystem();

  const page = h.renderPretty(
    ds.page("Starter", {}, {
      slots: {
        title: () => h.trustedRaw("Starter DS"),
        lead: () => h.p("PicoCSS-powered starter."),
        content: () => h.p("Hello from the starter design system."),
      },
    }),
  );

  assertEquals(
    page.trim(),
    `<!doctype html>
<html>
  <head>
    <link href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" rel="stylesheet">
  </head>
  <body>
    <section class="layout-shell" id="layout-shell">
      <main class="region-main" id="region-main">
        <h1>Starter DS</h1>
        <div class="region-lead">
          <p>PicoCSS-powered starter.</p>
        </div>
        <section class="region-content">
          <p>Hello from the starter design system.</p>
        </section>
      </main>
    </section>
  </body>
</html>`,
  );
});
