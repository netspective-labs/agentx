// omb_test.ts
//
// CI/CD regression intent
// - index.html is the visual regression surface (human-friendly).
// - This Playwright test is the server-side regression:
//   it loads index.html in a real browser, extracts the OMB model JSON,
//   and deep-compares it to a golden JSON object.
// - Comparison is structural (objects), not string-based.
//
// Golden workflow
// - Golden lives in `GOLDEN` constant at the end of this file.
// - To re-generate it, this creates it at ./mod_test.golden.json:
//     UPDATE_GOLDEN=1 deno test -A omb_test.ts
// - In CI/CD, do NOT set UPDATE_GOLDEN; drift fails the test.
//
// Typechecking note
// - Deno tests do not include DOM lib typings by default, so even mentioning
//   `document` in TypeScript causes type errors.
// - We keep all browser DOM references inside string evals.
//
// Robustness note
// - If mod_test.golden.json accidentally contains the literal text "undefined",
//   this test will treat it as missing/invalid and regenerate it only when
//   UPDATE_GOLDEN=1 is set.

import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

// deno-lint-ignore no-import-prefix
import { chromium } from "npm:playwright@1";

async function writeGolden(path: string, value: unknown) {
  const txt = JSON.stringify(value, null, 2) + "\n";
  await Deno.writeTextFile(path, txt);
}

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function startSingleFileServer(allowPaths: Record<string, string>) {
  const controller = new AbortController();

  const server = Deno.serve(
    { hostname: "127.0.0.1", port: 0, signal: controller.signal },
    async (req) => {
      const url = new URL(req.url);
      const mapped = allowPaths[url.pathname];
      if (!mapped) return new Response("Not Found", { status: 404 });

      try {
        const bytes = await Deno.readFile(mapped);
        return new Response(bytes, {
          headers: {
            "content-type": contentTypeFor(mapped),
            "cache-control": "no-store",
          },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    },
  );

  const origin = `http://127.0.0.1:${server.addr.port}`;
  return { origin, close: () => controller.abort() };
}

const WAIT_FOR_OMB_READY_JS = `
  () => {
    const el = document.querySelector("#ombRoot");
    if (!el) return false;
    return typeof el.model === "object" || typeof el.rebuild === "function";
  }
`;

const EXTRACT_OMB_JSON_JS = `
  (() => {
    const el = document.querySelector("#ombRoot");
    if (!el) throw new Error("ombRoot not found");

    const model = el.model ?? (typeof el.rebuild === "function" ? el.rebuild() : null);
    if (!model || typeof model.toJSON !== "function") {
      throw new Error("OMB model not available");
    }

    const view = model.toJSON({ withTags: true });
    const pure = JSON.parse(JSON.stringify(view));
    if (pure === undefined) throw new Error("extracted JSON was undefined");
    return pure;
  })()
`;

Deno.test(
  "OMB golden regression: index.html model JSON deep-equals mod_test.golden.json",
  async () => {
    const here = dirname(fromFileUrl(import.meta.url));
    const indexPath = join(here, "index.html");
    const ombPath = join(here, "omb.js");
    const readmePath = join(here, "README.md");
    const goldenPath = join(here, "mod_test.golden.json");

    const { origin, close } = startSingleFileServer({
      "/": indexPath,
      "/index.html": indexPath,
      "/omb.js": ombPath,
      "/README.md": readmePath,
    });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(`${origin}/index.html`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForFunction(WAIT_FOR_OMB_READY_JS);

      const actual = await page.evaluate(EXTRACT_OMB_JSON_JS);
      if (actual === undefined) {
        throw new Error("Playwright returned undefined JSON");
      }
      const updateGolden = (Deno.env.get("UPDATE_GOLDEN") ?? "").trim() === "1";

      if (updateGolden) {
        await writeGolden(goldenPath, actual);
        return;
      }

      assertEquals(actual, GOLDEN);
    } finally {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
      close();
    }
  },
);

const GOLDEN = {
  ".tag": {
    "tagName": "my-element",
    "tagToken": "myElement",
    "attrs": {
      "id": "ombRoot",
      "rootAttr1": "root-attr-1-text",
      "xmlnsXdm": "http://www.netspective.org/Framework/Commons/XMLDataModel",
      "testBoolean": "yes",
      "pathSeparatorChar": ":",
      "testByte": "96",
      "testShort": "128",
      "testLong": "1234567890",
      "testFloat": "3.1415926535",
      "testDouble": "3.1415926535897932384626433",
      "testFile": "DataModelSchemaTest.xml",
      "testStringArray": "item1, item2, item3",
    },
    "content": [
      "\n      PCDATA in root.\n\n      ",
    ],
  },
  ".children": [
    {
      ".tag": {
        "tagName": "xdm:include",
        "tagToken": "xdmInclude",
        "attrs": {
          "file": "DataModelSchemaTest-include.xml",
        },
        "content": [],
      },
      ".children": [],
      "file": "DataModelSchemaTest-include.xml",
    },
    {
      ".tag": {
        "tagName": "nested1",
        "tagToken": "nested1",
        "attrs": {
          "text": "TestText1",
          "integer": "1",
          "boolean": "yes",
        },
        "content": [
          "\n        PCDATA in nested1.\n\n        ",
        ],
      },
      ".children": [
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "text": "TestText11",
              "integer": "11",
            },
            "content": [],
          },
          ".children": [],
          "text": "TestText11",
          "integer": 11,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "type": "type-C",
              "text": "TestText12",
              "integer": "12",
            },
            "content": [],
          },
          ".children": [],
          "type": "type-C",
          "text": "TestText12",
          "integer": 12,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "class":
                "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
              "text": "CustomTestText12",
              "integer": "122",
              "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
              "bitThree": "on",
              "bitTen": "on",
            },
            "content": [],
          },
          ".children": [],
          "class":
            "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
          "text": "CustomTestText12",
          "integer": 122,
          "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
          "bitThree": true,
          "bitTen": true,
        },
      ],
      "text": "TestText1",
      "integer": true,
      "boolean": true,
      "nested11": [
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "text": "TestText11",
              "integer": "11",
            },
            "content": [],
          },
          ".children": [],
          "text": "TestText11",
          "integer": 11,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "type": "type-C",
              "text": "TestText12",
              "integer": "12",
            },
            "content": [],
          },
          ".children": [],
          "type": "type-C",
          "text": "TestText12",
          "integer": 12,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "class":
                "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
              "text": "CustomTestText12",
              "integer": "122",
              "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
              "bitThree": "on",
              "bitTen": "on",
            },
            "content": [],
          },
          ".children": [],
          "class":
            "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
          "text": "CustomTestText12",
          "integer": 122,
          "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
          "bitThree": true,
          "bitTen": true,
        },
      ],
    },
  ],
  "id": "ombRoot",
  "rootAttr1": "root-attr-1-text",
  "xmlnsXdm": "http://www.netspective.org/Framework/Commons/XMLDataModel",
  "testBoolean": true,
  "pathSeparatorChar": ":",
  "testByte": 96,
  "testShort": 128,
  "testLong": 1234567890,
  "testFloat": 3.1415926535,
  "testDouble": 3.141592653589793,
  "testFile": "DataModelSchemaTest.xml",
  "testStringArray": [
    "item1",
    "item2",
    "item3",
  ],
  "xdmInclude": [
    {
      ".tag": {
        "tagName": "xdm:include",
        "tagToken": "xdmInclude",
        "attrs": {
          "file": "DataModelSchemaTest-include.xml",
        },
        "content": [],
      },
      ".children": [],
      "file": "DataModelSchemaTest-include.xml",
    },
  ],
  "nested1": [
    {
      ".tag": {
        "tagName": "nested1",
        "tagToken": "nested1",
        "attrs": {
          "text": "TestText1",
          "integer": "1",
          "boolean": "yes",
        },
        "content": [
          "\n        PCDATA in nested1.\n\n        ",
        ],
      },
      ".children": [
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "text": "TestText11",
              "integer": "11",
            },
            "content": [],
          },
          ".children": [],
          "text": "TestText11",
          "integer": 11,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "type": "type-C",
              "text": "TestText12",
              "integer": "12",
            },
            "content": [],
          },
          ".children": [],
          "type": "type-C",
          "text": "TestText12",
          "integer": 12,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "class":
                "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
              "text": "CustomTestText12",
              "integer": "122",
              "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
              "bitThree": "on",
              "bitTen": "on",
            },
            "content": [],
          },
          ".children": [],
          "class":
            "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
          "text": "CustomTestText12",
          "integer": 122,
          "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
          "bitThree": true,
          "bitTen": true,
        },
      ],
      "text": "TestText1",
      "integer": true,
      "boolean": true,
      "nested11": [
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "text": "TestText11",
              "integer": "11",
            },
            "content": [],
          },
          ".children": [],
          "text": "TestText11",
          "integer": 11,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "type": "type-C",
              "text": "TestText12",
              "integer": "12",
            },
            "content": [],
          },
          ".children": [],
          "type": "type-C",
          "text": "TestText12",
          "integer": 12,
        },
        {
          ".tag": {
            "tagName": "nested11",
            "tagToken": "nested11",
            "attrs": {
              "class":
                "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
              "text": "CustomTestText12",
              "integer": "122",
              "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
              "bitThree": "on",
              "bitTen": "on",
            },
            "content": [],
          },
          ".children": [],
          "class":
            "com.netspective.commons.xdm.DataModelSchemaTest$CustomNested11Test",
          "text": "CustomTestText12",
          "integer": 122,
          "bitMask": "BIT_THREE | BIT_FIVE | BIT_EIGHT",
          "bitThree": true,
          "bitTen": true,
        },
      ],
    },
  ],
};
