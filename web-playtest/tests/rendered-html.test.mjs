import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Old Stables browser launcher", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Old Stables — Browser Playtest<\/title>/i);
  assert.match(html, /Browser playtest/);
  assert.match(html, /Open game only/);
  assert.match(html, /\/game\/index\.html/);
});

test("packages WebAssembly in sub-25 MB parts for Sites", async () => {
  await access(new URL("../dist/client/game/index.wasm.0", import.meta.url));
  await access(new URL("../dist/client/game/index.wasm.1", import.meta.url));
  await assert.rejects(
    access(new URL("../dist/client/game/index.wasm", import.meta.url)),
  );
  await assert.rejects(
    access(new URL("../dist/client/game/index.wasm.gz", import.meta.url)),
  );
});
