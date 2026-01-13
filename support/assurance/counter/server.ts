#!/usr/bin/env -S deno run -A --watch --node-modules-dir=auto
// support/assurance/counter/server.ts
//
// Counter assurance server.
// - Serves an index page generated via server-side fluent HTML (no public/index.html)
// - Demonstrates on-demand, in-memory bundling when browser imports counter-element
// - Demonstrates fragment updates via POST + SSE streaming fragments
//
// Run:
//   deno run -A support/assurance/counter/server.ts
//
// Open:
//   http://127.0.0.1:8000/

import * as path from "@std/path";
import * as H from "../../../lib/html/server/fluent.ts";

const encoder = new TextEncoder();

let count = 0;

// Paths
const rootDir = path.dirname(path.fromFileUrl(import.meta.url));
const publicDir = path.join(rootDir, "public");

// For demo simplicity, serve lib/ from repo root.
// Adjust if your static hosting differs.
const repoRoot = path.join(rootDir, "..", "..", "..");
const libDir = path.join(repoRoot, "lib");

// Helper: build HTML via fluent
const pageHtml = () => {
  const runtimePath = "./lib/html/browser-ua/runtime.auto.js";
  const counterModulePath = "./counter-element.auto.js";

  // Note: we keep script imports relative to the page URL ("/")
  // so they work in simple static setups.
  return H.render(
    H.doctype(),
    H.html(
      H.head(
        H.meta({ charset: "utf-8" }),
        H.meta({
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        }),
        H.title("JunxionUX Counter Assurance"),
        H.link({
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css",
        }),
        H.style(`
          main { max-width: 720px; }
          .card { padding: 1rem; border: 1px solid #ddd; border-radius: 12px; }
          .row { display: flex; gap: 0.5rem; align-items: baseline; margin: 0.5rem 0; }
          .label { opacity: 0.7; }
          .value { font-size: 1.25rem; }
          .hint { opacity: 0.7; font-size: 0.9rem; margin-top: 0.75rem; }
        `),
      ),
      H.body(
        H.main(
          { class: "container" },
          H.h1("Counter"),
          // Server renders the custom element; browser enhances/hydrates it.
          H.raw(`<jx-counter count="${count}"></jx-counter>`),
          H.p(
            { class: "hint" },
            "Click Increment to POST /inc (server returns a fragment that replaces the component). ",
            "SSE pushes “fragment” events to /events.",
          ),
        ),
        // Load runtime + component module, then enhance the doc.
        // runtime.auto.js is served from ./lib/... (static)
        // counter-element.auto.js is generated on-demand by Deno.bundle (in-memory)
        H.script(
          { type: "module" },
          H.raw(`
            import { enhance } from ${JSON.stringify(runtimePath)};
            import ${JSON.stringify(counterModulePath)};
            enhance();
          `),
        ),
      ),
    ),
  );
};

// Fragment contract: server always returns a DOM-ready fragment.
// We return the full custom element so swap "outer" is easy and robust.
const fragment = () => `<jx-counter count="${count}"></jx-counter>`;

// Static file serving
const contentType = (fp: string) => {
  const ext = path.extname(fp).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".ts") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".map") return "application/json; charset=utf-8";
  return "application/octet-stream";
};

const serveStaticFile = async (fp: string) => {
  const data = await Deno.readFile(fp);
  return new Response(data, { headers: { "content-type": contentType(fp) } });
};

// On-demand in-memory bundling demo.
// Browser imports:  ./counter-element.auto.js
// Server bundles:   ./public/counter-element.ts  (and its imports)
const bundleCounterElementInMemory = async () => {
  const entry = path.join(publicDir, "counter-element.ts");

  // This API shape matches the snippet you provided.
  // If your Deno version differs, keep the intent: bundle in-memory (write:false),
  // return the JS text from outputFiles.
  const result = await Deno.bundle({
    entrypoints: [entry],
    outputDir: "dist",
    platform: "browser",
    minify: true,
    write: false,
  });

  // Tiny example: show the generated output in server logs.
  // (For real usage, you might gate this behind a flag.)
  for (const file of result.outputFiles ?? []) {
    console.log(file.text());
  }

  // Prefer the first JS output file.
  const out = (result.outputFiles ?? []).find((f) => f.path.endsWith(".js")) ??
    (result.outputFiles ?? [])[0];

  if (!out) {
    return new Response("bundle failed", { status: 500 });
  }

  return new Response(out.text(), {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // keep cache off during assurance; enable cache later if desired
      "cache-control": "no-store",
    },
  });
};

Deno.serve({ hostname: "127.0.0.1", port: 8000 }, async (req) => {
  const url = new URL(req.url);

  // Index page via fluent HTML
  if (url.pathname === "/" && req.method === "GET") {
    return new Response(pageHtml(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Fragment update endpoint (pull)
  if (url.pathname === "/inc" && req.method === "POST") {
    count++;
    return new Response(fragment(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // SSE endpoint (push fragments)
  if (url.pathname === "/events" && req.method === "GET") {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // initial push
        controller.enqueue(
          encoder.encode(`event: fragment\ndata: ${fragment()}\n\n`),
        );

        const id = setInterval(() => {
          controller.enqueue(
            encoder.encode(`event: fragment\ndata: ${fragment()}\n\n`),
          );
        }, 2000);

        setTimeout(() => {
          clearInterval(id);
          controller.close();
        }, 60_000);
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive",
      },
    });
  }

  // On-demand bundle endpoint for the custom element module
  if (url.pathname === "/counter-element.auto.js" && req.method === "GET") {
    return await bundleCounterElementInMemory();
  }

  // Serve lib/ as static: /lib/...
  if (url.pathname.startsWith("/lib/")) {
    const fp = path.join(libDir, url.pathname);
    try {
      return await serveStaticFile(fp);
    } catch {
      return new Response("not found", { status: 404 });
    }
  }

  // Serve anything else under public/ (optional, for assets)
  // Example: /assets/... if you add them later
  if (url.pathname.startsWith("/assets/")) {
    const fp = path.join(publicDir, url.pathname.replace(/^\/+/, ""));
    try {
      return await serveStaticFile(fp);
    } catch {
      return new Response("not found", { status: 404 });
    }
  }

  return new Response("not found", { status: 404 });
});
