/**
 * lib/continuux/bundle.ts
 *
 * This module provides a small, pragmatic bundling helper for ContinuUX
 * applications that serve “pure TypeScript UI” browser modules directly from a
 * Deno server. It is designed to integrate with `lib/continuux/http.ts` by
 * returning Fetch `Response` objects and by exposing a middleware that can
 * intercept requests for client-side modules.
 *
 * What it does:
 * - Bundles a browser entry module using `Deno.bundle(...)` and returns the
 *   resulting JavaScript as a module response (`content-type: text/javascript`).
 * - Caches bundle output in-memory for the lifetime of the process, keyed by a
 *   stable `cacheKey` (defaulting to the entry string).
 * - Provides a convenience middleware (`autoTsJsBundler`) that detects requests
 *   for candidate client modules, resolves them to real filesystem paths, bundles
 *   them once, and serves the resulting JS module.
 *
 * Why it exists:
 * - ContinuUX favors server-driven UI with small client-side “user agent” modules,
 *   not a full SPA toolchain. For development and lightweight deployments it is
 *   useful to bundle TypeScript-to-JS on demand without introducing a separate
 *   build pipeline.
 * - This is intentionally simple: it is not meant to replace a production-grade
 *   asset pipeline, and it does not attempt advanced caching, content hashing,
 *   source maps, or aggressive minification by default.
 *
 * Key exports:
 * - {@link InMemoryBundler}: bundles an entry module with optional minification,
 *   caches the JS output, and can emit a proper JS module `Response`.
 * - {@link autoTsJsBundler}: middleware that:
 *   - only runs on GET requests
 *   - calls `isCandidate(url)` to decide whether the request should be treated as
 *     a client module request (and to obtain the module path)
 *   - resolves the path with `Deno.realPath` to ensure it exists and normalize it
 *   - bundles the module (cached per process) and serves it with `no-store`
 *   - returns a small JS module that throws if the module is missing or bundling
 *     fails, making client-side failures explicit and debuggable
 *
 * Typical usage:
 * - Add `autoTsJsBundler(...)` before your notFound handler so it can intercept
 *   requests for client-side module URLs.
 * - Use {@link InMemoryBundler#jsModuleResponse} when you want an explicit route
 *   that serves a particular entry module.
 *
 * Operational notes:
 * - Caching is in-memory only; restarting the process clears the cache.
 * - Defaults are biased toward development (for example, `defaultMinify: false`
 *   in the middleware) so that output stays readable and failures are clearer.
 */
import {
  asError,
  jsResponse,
  type Middleware,
  textResponse,
  type VarsRecord,
} from "./http.ts";

const stackIfAny = (err: Error) => (err.stack ? `\n\n${err.stack}` : "");

export type BundleOptions = {
  cacheKey?: string;
  minify?: boolean;
  cacheControl?: string; // default "no-store"
};

export type BundleOk = { ok: true; js: string; cacheKey: string };
export type BundleErr = {
  ok: false;
  status: number;
  message: string;
  details?: string;
};
export type BundleResult = BundleOk | BundleErr;

export type InMemoryBundlerConfig = {
  defaultMinify?: boolean;
};

export class InMemoryBundler {
  readonly #cache = new Map<string, string>();
  readonly #defaultMinify: boolean;

  constructor(cfg: InMemoryBundlerConfig = {}) {
    this.#defaultMinify = cfg.defaultMinify ?? true;
  }

  get cacheSize(): number {
    return this.#cache.size;
  }

  clearCache(): void {
    this.#cache.clear();
  }

  prime(cacheKey: string, js: string): void {
    this.#cache.set(cacheKey, js);
  }

  peek(cacheKey: string): string | undefined {
    return this.#cache.get(cacheKey);
  }

  async bundle(entry: string, opts: BundleOptions = {}): Promise<BundleResult> {
    const cacheKey = opts.cacheKey ?? entry;
    const cached = this.#cache.get(cacheKey);
    if (cached) return { ok: true, js: cached, cacheKey };

    let result: Awaited<ReturnType<typeof Deno.bundle>>;
    try {
      result = await Deno.bundle({
        entrypoints: [entry],
        outputDir: "dist",
        platform: "browser",
        minify: opts.minify ?? this.#defaultMinify,
        write: false,
      });
    } catch (err) {
      const e = asError(err);
      return {
        ok: false,
        status: 500,
        message:
          `Bundle error: Deno.bundle failed\n\nEntry:\n${entry}\n\n${e.message}${
            stackIfAny(e)
          }`,
      };
    }

    const outputs = result.outputFiles ?? [];
    if (outputs.length === 0) {
      return {
        ok: false,
        status: 500,
        message:
          `Bundle error: no output files produced\n\nEntry:\n${entry}\n\nTip: verify the module exists and that imports resolve.`,
      };
    }

    const jsFile = outputs.find((f) => f.path.endsWith(".js")) ?? outputs[0];
    const jsText = jsFile?.text?.() ?? "";
    if (!jsText.trim()) {
      return {
        ok: false,
        status: 500,
        message:
          `Bundle error: JavaScript output is empty\n\nEntry:\n${entry}\n\nTip: check import graph and bundler errors.`,
      };
    }

    this.#cache.set(cacheKey, jsText);
    return { ok: true, js: jsText, cacheKey };
  }

  async jsModuleResponse(
    entry: string,
    opts: BundleOptions = {},
  ): Promise<Response> {
    const r = await this.bundle(entry, opts);
    if (!r.ok) return textResponse(r.message, r.status);
    const cc = opts.cacheControl ?? "no-store";
    return jsResponse(r.js, cc);
  }
}

export function autoTsJsBundler<State, Vars extends VarsRecord>(
  { isCandidate, notFound, jsThrowStatus }: {
    isCandidate: (url: URL) => false | string;
    jsThrowStatus?: (suggested: number) => number;
    notFound?: (url: URL, err: unknown) => void;
  },
): Middleware<State, Vars> {
  const bundler = new InMemoryBundler({ defaultMinify: false });
  const jsThrow = (title: string, detail: string) =>
    [
      `// ${title}`,
      `throw new Error(${JSON.stringify(`${title}\n\n${detail}`)});`,
      `export {};`,
      ``,
    ].join("\n");

  // Add this middleware BEFORE your notFound handler (so it can intercept)
  return async (c, next) => {
    if (c.req.method !== "GET") return await next();

    const url = new URL(c.req.url);
    const candidate = isCandidate(url);
    if (!candidate) return await next();

    let entry: string;
    try {
      // realPath ensures the file exists and normalizes
      entry = await Deno.realPath(candidate);
    } catch (err) {
      notFound?.(url, err);
      return jsResponse(
        jsThrow("Client module not found", `${candidate}\n${String(err)}`),
        "no-store",
        jsThrowStatus?.(404) ?? 404,
      );
    }

    // Use a stable cacheKey so we bundle once per process per module path.
    const cacheKey = `client:${entry}`;

    const r = await bundler.bundle(entry, { cacheKey, minify: false });

    if (!r.ok) {
      return jsResponse(
        jsThrow("Failed to bundle client module", r.message),
        "no-store",
        jsThrowStatus?.(r.status) ?? r.status,
      );
    }

    // Proper browser JS module response
    return jsResponse(r.js, "no-store", 200);
  };
}
